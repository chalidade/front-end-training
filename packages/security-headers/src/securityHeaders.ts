/**
 * Preset header keamanan HTTP. Fungsi di sini hanya membangun string header;
 * memasangnya ke server (Next.js, Vite, Express) adalah satu baris di sisi kamu.
 */

/** Nilai satu directive CSP: daftar source, atau `true` untuk directive tanpa nilai. */
export type CspValue = readonly string[] | true;

/** Directive CSP dengan nama aslinya, misalnya `"script-src"` atau `"upgrade-insecure-requests"`. */
export type CspDirectives = Readonly<Record<string, CspValue | false | undefined>>;

// Keyword CSP wajib dikutip tunggal. `self` tanpa kutip berarti host bernama "self".
const KEYWORDS = new Set([
  "self",
  "none",
  "unsafe-inline",
  "unsafe-eval",
  "unsafe-hashes",
  "strict-dynamic",
  "report-sample",
  "wasm-unsafe-eval",
  "inline-speculation-rules",
]);
const NEEDS_QUOTES = /^(nonce|sha256|sha384|sha512)-/;

function checkSource(directive: string, source: string): void {
  if (source.trim() === "" || /[\s;,]/.test(source)) {
    throw new Error(`CSP ${directive}: source "${source}" tidak boleh kosong atau berisi spasi, ";" atau ","`);
  }
  if (KEYWORDS.has(source) || NEEDS_QUOTES.test(source)) {
    throw new Error(`CSP ${directive}: keyword harus dikutip, tulis "'${source}'" bukan "${source}"`);
  }
}

/**
 * Menyusun objek directive menjadi string `Content-Security-Policy`.
 * Directive bernilai `false`/`undefined` dilewati; `true` ditulis tanpa nilai.
 * Melempar Error untuk kesalahan yang diam-diam melemahkan kebijakan,
 * misalnya keyword tanpa kutip (`self` alih-alih `'self'`).
 */
export function buildCsp(directives: CspDirectives): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(directives)) {
    if (value === false || value === undefined) continue;
    if (!/^[a-z][a-z-]*$/.test(name)) {
      throw new Error(`CSP: nama directive "${name}" tidak valid (pakai huruf kecil dan "-", misalnya "script-src")`);
    }
    if (value === true) {
      parts.push(name);
      continue;
    }
    if (value.length === 0) {
      throw new Error(`CSP ${name}: daftar source kosong; pakai ["'none'"] untuk melarang semuanya`);
    }
    for (const source of value) checkSource(name, source);
    parts.push(`${name} ${value.join(" ")}`);
  }
  return parts.join("; ");
}

/**
 * CSP "strict" berbasis nonce, mengikuti rekomendasi web.dev/strict-csp:
 * hanya script dengan nonce yang benar (dan script yang dimuatnya) yang jalan.
 * `https:` dan `'unsafe-inline'` hanya fallback untuk browser lama; browser
 * yang mengerti `'strict-dynamic'`/nonce mengabaikan keduanya.
 */
export function strictCsp(nonce: string, extra: CspDirectives = {}): CspDirectives {
  if (!/^[A-Za-z0-9+/_-]+=*$/.test(nonce)) {
    throw new Error("strictCsp: nonce harus base64/base64url, misalnya dari createNonce()");
  }
  return {
    "script-src": [`'nonce-${nonce}'`, "'strict-dynamic'", "https:", "'unsafe-inline'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "frame-ancestors": ["'none'"],
    ...extra,
  };
}

/** Nonce acak 128-bit dalam base64. Buat baru untuk SETIAP respons, jangan dipakai ulang. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Fitur browser untuk `Permissions-Policy`: `[]` mematikan, `["self"]` hanya origin sendiri. */
export type PermissionsPolicy = Readonly<Record<string, readonly string[]>>;

/** Menyusun `Permissions-Policy`, misalnya `{ camera: [] }` → `camera=()`. */
export function buildPermissionsPolicy(policy: PermissionsPolicy): string {
  return Object.entries(policy)
    .map(([feature, allow]) => {
      const list = allow.map((origin) => (origin === "self" || origin === "*" ? origin : `"${origin}"`));
      return `${feature}=(${list.join(" ")})`;
    })
    .join(", ");
}

export interface HstsOptions {
  /** Detik. Default 2 tahun (63072000), syarat minimal daftar preload adalah 1 tahun. */
  maxAge?: number;
  includeSubDomains?: boolean;
  /** Hanya nyalakan kalau kamu yakin semua subdomain siap HTTPS selamanya. */
  preload?: boolean;
}

export interface SecurityHeadersOptions {
  /** Directive CSP. Default: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`. */
  csp?: CspDirectives | false;
  /** Kirim CSP sebagai `Content-Security-Policy-Report-Only` (hanya melapor, tidak memblokir). */
  cspReportOnly?: boolean;
  /** `false` untuk development di http://localhost. */
  hsts?: HstsOptions | false;
  referrerPolicy?: string | false;
  permissionsPolicy?: PermissionsPolicy | false;
  /** `X-Frame-Options` untuk browser yang belum mengerti `frame-ancestors`. */
  frameOptions?: "DENY" | "SAMEORIGIN" | false;
  /** `Cross-Origin-Opener-Policy`. */
  coop?: "same-origin" | "same-origin-allow-popups" | "unsafe-none" | false;
}

export const DEFAULT_CSP: CspDirectives = {
  "default-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'none'"],
};

export const DEFAULT_PERMISSIONS_POLICY: PermissionsPolicy = {
  camera: [],
  microphone: [],
  geolocation: [],
};

/**
 * Header keamanan dengan default yang aman. Setiap header bisa diganti atau
 * dimatikan dengan `false`. Hasilnya objek biasa `{ nama: nilai }`.
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const {
    csp = DEFAULT_CSP,
    cspReportOnly = false,
    hsts = {},
    referrerPolicy = "strict-origin-when-cross-origin",
    permissionsPolicy = DEFAULT_PERMISSIONS_POLICY,
    frameOptions = "DENY",
    coop = "same-origin",
  } = options;

  const headers: Record<string, string> = {};
  if (csp !== false) {
    const name = cspReportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
    headers[name] = buildCsp(csp);
  }
  if (hsts !== false) {
    const { maxAge = 63072000, includeSubDomains = true, preload = false } = hsts;
    if (!Number.isInteger(maxAge) || maxAge < 0) throw new Error("hsts.maxAge harus bilangan bulat ≥ 0 (detik)");
    if (preload && (maxAge < 31536000 || !includeSubDomains)) {
      throw new Error("hsts.preload butuh maxAge ≥ 31536000 dan includeSubDomains: true");
    }
    headers["Strict-Transport-Security"] =
      `max-age=${maxAge}` + (includeSubDomains ? "; includeSubDomains" : "") + (preload ? "; preload" : "");
  }
  headers["X-Content-Type-Options"] = "nosniff";
  if (referrerPolicy !== false) headers["Referrer-Policy"] = referrerPolicy;
  if (permissionsPolicy !== false) headers["Permissions-Policy"] = buildPermissionsPolicy(permissionsPolicy);
  if (frameOptions !== false) headers["X-Frame-Options"] = frameOptions;
  if (coop !== false) headers["Cross-Origin-Opener-Policy"] = coop;
  return headers;
}

/** Bentuk `[{ key, value }]` untuk `headers()` di `next.config.js`. */
export function toHeaderList(headers: Record<string, string>): { key: string; value: string }[] {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}
