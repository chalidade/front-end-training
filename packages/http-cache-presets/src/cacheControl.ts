/**
 * Builder dan preset untuk header `Cache-Control` (RFC 9111). Fungsi di sini hanya
 * membangun string; memasangnya ke server atau CDN adalah satu baris di sisi kamu.
 */

/** Durasi dalam detik (angka) atau string seperti `"30s"`, `"10m"`, `"1h"`, `"7d"`, `"1w"`, `"1y"`. */
export type Duration = number | `${number}${"s" | "m" | "h" | "d" | "w" | "y"}`;

const UNIT: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, y: 31536000 };

/** Mengubah `Duration` menjadi detik bulat. Melempar Error untuk nilai negatif, pecahan, atau format salah. */
export function toSeconds(duration: Duration): number {
  let seconds: number;
  if (typeof duration === "number") {
    seconds = duration;
  } else {
    const match = /^(\d+(?:\.\d+)?)([smhdwy])$/.exec(duration);
    if (!match) throw new Error(`Durasi "${duration}" tidak valid, contoh yang benar: "30s", "10m", "1d", "1y"`);
    seconds = Number(match[1]) * (UNIT[match[2] as string] as number);
  }
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new Error(`Durasi harus bilangan bulat detik ≥ 0, dapat ${seconds}`);
  }
  return seconds;
}

export interface CacheControlOptions {
  /** Boleh disimpan shared cache (CDN/proxy). */
  public?: boolean;
  /** Hanya cache browser, jangan di CDN/proxy. */
  private?: boolean;
  /** Boleh disimpan, tapi wajib revalidasi sebelum setiap pemakaian. */
  noCache?: boolean;
  /** Jangan simpan sama sekali. Tidak bisa digabung dengan directive lain. */
  noStore?: boolean;
  maxAge?: Duration;
  /** `max-age` khusus shared cache (CDN). */
  sMaxAge?: Duration;
  staleWhileRevalidate?: Duration;
  staleIfError?: Duration;
  /** Setelah basi, jangan pernah dipakai tanpa revalidasi. */
  mustRevalidate?: boolean;
  /** Selama segar, jangan revalidasi walau user menekan reload. Butuh `maxAge`. */
  immutable?: boolean;
  /** Larang CDN/proxy mengubah isi (misalnya kompresi ulang gambar). */
  noTransform?: boolean;
}

/**
 * Menyusun header `Cache-Control` dari objek opsi. Melempar Error untuk kombinasi yang
 * kontradiktif atau tidak berguna, misalnya `public` + `private`, `noStore` dengan
 * directive lain, atau `immutable` tanpa `maxAge`.
 */
export function cacheControl(options: CacheControlOptions): string {
  const o = options;
  if (o.public && o.private) throw new Error("Cache-Control: public dan private tidak bisa dipakai bersamaan");
  if (o.noStore) {
    const others = Object.entries(o).filter(([key, value]) => key !== "noStore" && value !== undefined && value !== false);
    if (others.length > 0) {
      throw new Error(`Cache-Control: no-store tidak bisa digabung dengan ${others.map(([key]) => key).join(", ")}`);
    }
    return "no-store";
  }
  if (o.immutable && o.maxAge === undefined) {
    throw new Error("Cache-Control: immutable butuh maxAge, karena immutable hanya berlaku selama respons masih segar");
  }
  if (o.immutable && o.noCache) {
    throw new Error("Cache-Control: immutable dan no-cache saling bertentangan");
  }
  if (o.private && o.sMaxAge !== undefined) {
    throw new Error("Cache-Control: s-maxage tidak berguna dengan private, karena shared cache tidak menyimpannya");
  }

  const parts: string[] = [];
  if (o.public) parts.push("public");
  if (o.private) parts.push("private");
  if (o.noCache) parts.push("no-cache");
  if (o.maxAge !== undefined) parts.push(`max-age=${toSeconds(o.maxAge)}`);
  if (o.sMaxAge !== undefined) parts.push(`s-maxage=${toSeconds(o.sMaxAge)}`);
  if (o.staleWhileRevalidate !== undefined) parts.push(`stale-while-revalidate=${toSeconds(o.staleWhileRevalidate)}`);
  if (o.staleIfError !== undefined) parts.push(`stale-if-error=${toSeconds(o.staleIfError)}`);
  if (o.mustRevalidate) parts.push("must-revalidate");
  if (o.immutable) parts.push("immutable");
  if (o.noTransform) parts.push("no-transform");
  if (parts.length === 0) {
    throw new Error("Cache-Control: tidak ada directive; tanpa header, browser memakai heuristic freshness");
  }
  return parts.join(", ");
}

/** Preset untuk pola yang dipakai hampir semua aplikasi. */
export const cachePresets = {
  /** Aset dengan hash di nama file (`app.3f9a1c7e.js`). Isi berubah = nama berubah. */
  immutable: cacheControl({ public: true, maxAge: "1y", immutable: true }),
  /** HTML / entry point dan aset tanpa hash: selalu revalidasi, murah lewat 304 kalau ada ETag. */
  revalidate: cacheControl({ noCache: true }),
  /** Respons per user: jangan sampai tersimpan di CDN. */
  private: cacheControl({ private: true, noCache: true }),
  /** Token, data bank, halaman setelah logout: jangan tersimpan di disk. */
  sensitive: cacheControl({ noStore: true }),
} as const;

/**
 * Data publik yang boleh sedikit basi (daftar produk, artikel): segar `maxAge`, lalu boleh
 * dipakai `staleWhileRevalidate` lagi sambil diperbarui di background.
 */
export function publicApi(maxAge: Duration = "1m", staleWhileRevalidate: Duration = "5m"): string {
  return cacheControl({ public: true, maxAge, staleWhileRevalidate });
}

export interface PresetForOptions {
  /**
   * Pola nama file ber-hash. Default: hash heksadesimal ≥ 8 karakter yang diapit `.` atau `-`
   * (`app.3f9a1c7e.js`, `main-a1b2c3d4.css`). Untuk Vite pakai `/^\/assets\//`, karena hash
   * Vite memakai base64url dan semua output-nya ada di folder `assets/`.
   */
  hashed?: RegExp;
}

const DEFAULT_HASHED = /[.-][0-9a-f]{8,}\.[a-z0-9]+$/i;

/**
 * Memilih preset dari path request. Hanya ada dua kemungkinan, dan itu disengaja: aset
 * ber-hash di-cache selamanya, sisanya selalu direvalidasi. Kalau ragu, jawabannya revalidate,
 * karena salah memberi `immutable` tidak bisa ditarik kembali dari browser user.
 */
export function presetFor(path: string, options: PresetForOptions = {}): string {
  const pathname = path.split(/[?#]/)[0] ?? path;
  const hashed = options.hashed ?? DEFAULT_HASHED;
  return hashed.test(pathname) ? cachePresets.immutable : cachePresets.revalidate;
}
