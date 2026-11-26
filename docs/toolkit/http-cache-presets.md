# @chalidade/http-cache-presets

Builder dan preset untuk header `Cache-Control`. Isinya pola dari
[deep dive HTTP Caching](/deep-dives/http-caching) dalam bentuk kode: aset ber-hash di-cache
selamanya, HTML selalu direvalidasi, data per user tidak masuk CDN, dan data sensitif tidak
tersimpan sama sekali. Tanpa dependensi.

```bash
pnpm add @chalidade/http-cache-presets
# atau
npm install @chalidade/http-cache-presets
```

::: warning Belum dipublish
Package ini belum dipublish ke npm. Sementara ini, salin source-nya dari
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/http-cache-presets/src).
:::

## Kenapa perlu paket?

`Cache-Control` adalah satu baris teks, tapi kesalahannya mahal dan diam:

- **`max-age` panjang di URL yang isinya bisa berubah** tidak bisa ditarik kembali. Browser user
  akan memakai versi lama sampai masa berlakunya habis, apa pun yang kamu deploy.
- **Kombinasi yang kontradiktif** seperti `public, private` atau `no-store, max-age=3600` tidak
  menghasilkan error. Cache memilih salah satu tafsiran, dan tafsirannya bisa berbeda antara
  browser dan CDN.
- **Lupa memasang header** tidak berarti "jangan cache". Tanpa `Cache-Control`, browser boleh
  memakai *heuristic freshness* dari `Last-Modified` (eksperimen di bawah menunjukkan akibatnya).

`cacheControl` melempar Error untuk kombinasi seperti itu, dan preset-nya memberi nilai yang benar
untuk kasus yang paling sering.

## Eksperimen: apa yang benar-benar diminta ulang

Server Node kecil mengirim header yang berbeda untuk setiap file, semuanya dengan `ETag`. Halaman
dibuka di Chromium (Playwright) empat kali: pertama, navigasi ulang, navigasi ulang setelah 1,5
detik, lalu tombol reload. Kolom terakhir adalah status yang diterima server untuk setiap kunjungan.

```text
file               Cache-Control                                  diterima server
/                  no-cache                                       200 304 304 304
/app.3f9a1c7e.js   public, max-age=31536000, immutable            200
/logo.js           (tanpa header, Last-Modified 30 hari lalu)     200
/api.js            public, max-age=1, stale-while-revalidate=30   200 304
/me.js             no-store                                       200 200 200 200
```

Yang bisa dibaca dari tabel ini:

- **HTML dengan `no-cache`** selalu bertanya ke server, tapi jawabannya `304` tanpa body. Deploy
  baru langsung terlihat dan biayanya kecil.
- **Aset `immutable`** hanya diminta sekali, termasuk saat reload.
- **`/logo.js` tanpa header juga hanya diminta sekali.** Browser menganggapnya segar berdasarkan
  umurnya (heuristik umum: 10% dari selisih `Last-Modified`, di sini sekitar 3 hari). Kalau file
  ini diganti tanpa ganti nama, user bisa melihat versi lama berhari-hari. Ini alasan `presetFor`
  memberi `no-cache` untuk semua yang tidak ber-hash.
- **`stale-while-revalidate`**: kunjungan ketiga terjadi setelah `max-age=1` habis. Browser
  memakai versi yang ada lalu merevalidasi di background (itulah `304`-nya), jadi halaman tidak
  menunggu jaringan.
- **`no-store`** diminta ulang setiap kali, tanpa pengecualian.

## API

### `cacheControl(options)`

```ts
import { cacheControl } from "@chalidade/http-cache-presets";

cacheControl({ public: true, maxAge: "1m", sMaxAge: "1h", staleWhileRevalidate: "5m" });
// "public, max-age=60, s-maxage=3600, stale-while-revalidate=300"
```

| Opsi | Directive |
| --- | --- |
| `public` / `private` | `public` / `private` |
| `noCache` / `noStore` | `no-cache` / `no-store` |
| `maxAge` / `sMaxAge` | `max-age=N` / `s-maxage=N` (khusus CDN) |
| `staleWhileRevalidate` / `staleIfError` | `stale-while-revalidate=N` / `stale-if-error=N` |
| `mustRevalidate` / `immutable` / `noTransform` | `must-revalidate` / `immutable` / `no-transform` |

Durasi bisa berupa angka detik atau string `"30s"`, `"10m"`, `"1h"`, `"7d"`, `"1w"`, `"1y"`.

Melempar Error untuk: `public` + `private`, `noStore` dengan directive lain, `immutable` tanpa
`maxAge` (immutable hanya berlaku selama respons segar), `immutable` + `noCache`, `private` +
`sMaxAge` (CDN tidak menyimpannya), opsi kosong, dan durasi negatif atau pecahan detik.

### `cachePresets` dan `publicApi(maxAge?, staleWhileRevalidate?)`

| Preset | Nilai | Untuk |
| --- | --- | --- |
| `cachePresets.immutable` | `public, max-age=31536000, immutable` | aset dengan hash di nama file |
| `cachePresets.revalidate` | `no-cache` | HTML, entry point, aset tanpa hash |
| `cachePresets.private` | `private, no-cache` | respons per user |
| `cachePresets.sensitive` | `no-store` | token, data bank, halaman akun |
| `publicApi()` | `public, max-age=60, stale-while-revalidate=300` | data publik yang boleh sedikit basi |

`revalidate` dan `private` hanya murah kalau server mengirim `ETag` atau `Last-Modified`, supaya
revalidasi bisa dijawab `304`. Kebanyakan server statis dan framework sudah melakukannya.

### `presetFor(path, options?)`

Memilih preset dari path: `immutable` untuk nama file ber-hash, `revalidate` untuk sisanya. Tidak
ada pilihan ketiga, dan itu disengaja. Kalau ragu, jawabannya revalidate.

```ts
presetFor("/static/app.3f9a1c7e.js"); // "public, max-age=31536000, immutable"
presetFor("/index.html");             // "no-cache"
presetFor("/my-component.js");        // "no-cache", nama panjang biasa bukan hash
```

Pola default mengenali hash heksadesimal minimal 8 karakter (`app.3f9a1c7e.js`,
`main-a1b2c3d4.css`). Hash Vite memakai base64url (`index-BvH2kQ_x.js`) yang tidak bisa dibedakan
dari kata biasa, jadi untuk Vite pakai foldernya:

```ts
presetFor(req.path, { hashed: /^\/assets\// });
```

## Memasang di server

**Express** dengan `express.static`:

```ts
import { cachePresets, presetFor } from "@chalidade/http-cache-presets";

app.use(
  express.static("dist", {
    setHeaders: (res, filePath) => res.setHeader("Cache-Control", presetFor(filePath.replace(/\\/g, "/"))),
  }),
);
app.get("/api/me", (_req, res) => res.set("Cache-Control", cachePresets.private).json(user));
```

**Next.js** sudah mengatur cache untuk `/_next/static` sendiri. Pakai paket ini untuk route
handler dan file di `public/`:

```ts
// app/api/produk/route.ts
import { publicApi } from "@chalidade/http-cache-presets";

export async function GET() {
  return Response.json(await getProduk(), { headers: { "Cache-Control": publicApi("1m", "10m") } });
}
```

**CDN atau hosting statis** (Netlify, Cloudflare Pages, Vercel) biasanya memakai file konfigurasi
header. Nilai dari `cachePresets` bisa disalin langsung ke sana.

## Yang sengaja tidak ada

- **Header `Vary`, `ETag`, dan `Expires`.** `ETag` dibuat server dari isi file, dan `Expires`
  kalah oleh `max-age`. `Vary` dibahas di [deep dive HTTP Caching](/deep-dives/http-caching).
- **Konfigurasi per CDN.** Setiap CDN punya directive tambahan sendiri (misalnya
  `CDN-Cache-Control`). Paket ini hanya menulis yang ada di RFC 9111 dan RFC 5861.

## Konsep terkait

[01 Internet & HTTP](/roadmap/01-internet), [deep dive HTTP Caching](/deep-dives/http-caching),
dan [`@chalidade/security-headers`](/toolkit/security-headers) untuk header keamanan di respons
yang sama.

## Belajar dari source-nya

Latihan yang disarankan: baca
[`cacheControl.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/http-cache-presets/src/cacheControl.ts),
lalu jawab sebelum melihat test-nya. Kenapa `presetFor` tidak punya pilihan "cache sebentar" untuk
file tanpa hash? Kenapa `immutable` tanpa `maxAge` ditolak, bukan diberi default? Kalau
`/logo.js` di eksperimen di atas diganti hari ini, kapan user pertama kali melihat versi barunya?
