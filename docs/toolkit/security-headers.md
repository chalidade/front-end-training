# @chalidade/security-headers

Preset header keamanan HTTP (CSP, HSTS, dan kawan-kawan) dengan default yang aman, plus builder
CSP yang menolak kesalahan yang diam-diam melemahkan kebijakan. Tanpa dependensi, dan hasilnya
objek biasa `{ nama: nilai }` yang bisa dipasang di Next.js, Vite, atau Express.

```bash
pnpm add @chalidade/security-headers
# atau
npm install @chalidade/security-headers
```

::: warning Belum dipublish
Package ini belum dipublish ke npm. Sementara ini, salin source-nya dari
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/security-headers/src).
:::

## Kenapa perlu paket?

Header keamanan hanyalah string, tapi string yang mudah salah tanpa pesan error apa pun:

- **`default-src self`** (tanpa kutip) tidak berarti "origin sendiri". Browser membacanya sebagai
  *host bernama `self`*, jadi script dari origin-mu sendiri ikut diblokir.
- **Nilai dari variabel** (misalnya nonce atau domain CDN dari env) yang berisi `;` bisa
  menyisipkan directive baru ke dalam CSP.
- **HSTS `preload`** punya syarat (`max-age` minimal 1 tahun dan `includeSubDomains`). Salah
  pasang di domain yang subdomainnya belum HTTPS bisa membuat subdomain itu tidak bisa diakses
  berbulan-bulan.

`buildCsp` dan `securityHeaders` melempar Error untuk semua kasus di atas, saat build atau saat
server start, bukan saat pengguna sudah terdampak.

## Eksperimen: apa yang benar-benar diblokir

Halaman yang sama dimuat di Chromium (Playwright) dengan header yang berbeda. Halaman berisi satu
script ber-nonce yang memuat `/a.js`, satu script inline tanpa nonce (anggap hasil injeksi XSS),
dan satu `<img onerror>`.

```text
CSP                                         yang jalan                           error konsol
tanpa CSP                                   nonce, injected, onerror, file       0
strictCsp(nonce)                            nonce, file                          2
default-src 'self'; script-src 'self' …     file                                 0
default-src self;   script-src self …       (tidak ada)                          1
```

Baris kedua menunjukkan cara kerja `'strict-dynamic'`: `/a.js` tetap jalan karena dimuat oleh
script yang dipercaya, sementara script injeksi dan handler `onerror` diblokir. Baris terakhir
adalah jebakan kutip: satu karakter yang hilang memblokir script milik sendiri. `buildCsp` menolak
input itu dengan pesan `keyword harus dikutip, tulis "'self'" bukan "self"`.

## API

### `securityHeaders(options?)`

```ts
import { securityHeaders } from "@chalidade/security-headers";

securityHeaders();
// {
//   "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
//   "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
//   "X-Content-Type-Options": "nosniff",
//   "Referrer-Policy": "strict-origin-when-cross-origin",
//   "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
//   "X-Frame-Options": "DENY",
//   "Cross-Origin-Opener-Policy": "same-origin",
// }
```

| Opsi | Default | Arti |
| --- | --- | --- |
| `csp` | `DEFAULT_CSP` | objek directive; `false` untuk tidak mengirim CSP |
| `cspReportOnly` | `false` | kirim sebagai `Content-Security-Policy-Report-Only` (melapor, tidak memblokir) |
| `hsts` | `{ maxAge: 63072000, includeSubDomains: true, preload: false }` | `false` untuk development di `http://localhost` |
| `referrerPolicy` | `"strict-origin-when-cross-origin"` | nilai `Referrer-Policy` |
| `permissionsPolicy` | kamera, mikrofon, dan lokasi dimatikan | objek fitur, lihat `buildPermissionsPolicy` |
| `frameOptions` | `"DENY"` | `X-Frame-Options` untuk browser yang belum mengerti `frame-ancestors` |
| `coop` | `"same-origin"` | `Cross-Origin-Opener-Policy` |

Setiap opsi bisa diisi `false` untuk menghilangkan header-nya. `X-Content-Type-Options: nosniff`
selalu dikirim karena tidak ada alasan untuk mematikannya.

### `buildCsp(directives)`

```ts
buildCsp({
  "default-src": ["'self'"],
  "img-src": ["'self'", "data:", "https://cdn.example.com"],
  "upgrade-insecure-requests": true, // directive tanpa nilai
  "script-src": isDev && false,      // false/undefined dilewati
});
// "default-src 'self'; img-src 'self' data: https://cdn.example.com; upgrade-insecure-requests"
```

Melempar Error untuk: keyword tanpa kutip (`self`, `none`, `unsafe-inline`, `nonce-…`,
`sha256-…`, dan lainnya), source berisi spasi, `;` atau `,`, daftar source kosong (pakai
`["'none'"]`), dan nama directive yang bukan huruf kecil (misalnya `scriptSrc`).

### `strictCsp(nonce, extra?)` dan `createNonce()`

CSP *strict* berbasis nonce, mengikuti rekomendasi
[web.dev/strict-csp](https://web.dev/articles/strict-csp):

```ts
const nonce = createNonce(); // 16 byte acak, base64. Buat baru untuk SETIAP respons.
buildCsp(strictCsp(nonce, { "report-uri": ["/csp-report"] }));
// "script-src 'nonce-…' 'strict-dynamic' https: 'unsafe-inline'; object-src 'none';
//  base-uri 'none'; frame-ancestors 'none'; report-uri /csp-report"
```

`https:` dan `'unsafe-inline'` hanya fallback untuk browser lama. Browser yang mengerti nonce
mengabaikan `'unsafe-inline'`, dan yang mengerti `'strict-dynamic'` mengabaikan `https:`.
Nonce yang dipakai ulang antar-respons tidak melindungi apa pun, karena penyerang bisa membacanya
dari halaman lalu memakainya.

### `buildPermissionsPolicy(policy)` dan `toHeaderList(headers)`

```ts
buildPermissionsPolicy({ camera: [], geolocation: ["self", "https://maps.example.com"] });
// 'camera=(), geolocation=(self "https://maps.example.com")'

toHeaderList({ "X-Content-Type-Options": "nosniff" });
// [{ key: "X-Content-Type-Options", value: "nosniff" }]  ← bentuk untuk next.config
```

## Memasang di framework

**Next.js** (header statis, tanpa nonce):

```js
// next.config.mjs
import { securityHeaders, toHeaderList } from "@chalidade/security-headers";

export default {
  async headers() {
    return [{ source: "/(.*)", headers: toHeaderList(securityHeaders()) }];
  },
};
```

Untuk CSP ber-nonce di Next.js, nonce harus dibuat per request di middleware. Ikuti panduan
[Content Security Policy di dokumentasi Next.js](https://nextjs.org/docs/app/guides/content-security-policy)
dan isi header-nya dengan `buildCsp(strictCsp(createNonce()))`.

**Vite** (dev server dan `vite preview`):

```ts
// vite.config.ts
import { securityHeaders } from "@chalidade/security-headers";

const headers = securityHeaders({ hsts: false, cspReportOnly: true });
export default { server: { headers }, preview: { headers } };
```

Dev server Vite menyuntikkan script inline dan WebSocket untuk HMR, jadi CSP yang memblokir
biasanya merusak development. Pakai `cspReportOnly` di dev untuk melihat pelanggaran tanpa
memblokir, lalu pasang header sebenarnya di server atau CDN produksi.

**Express:**

```ts
import { securityHeaders } from "@chalidade/security-headers";

const headers = securityHeaders();
app.use((_req, res, next) => {
  res.set(headers);
  next();
});
```

## Yang sengaja tidak ada

- **Middleware per framework.** Hasilnya objek biasa, dan memasangnya hanya beberapa baris. Satu
  paket kecil lebih mudah dibaca daripada tiga adapter.
- **Header yang sudah usang.** `X-XSS-Protection` sudah dihapus dari browser modern dan bisa
  memperburuk keadaan. `Expect-CT` juga sudah tidak dipakai.
- **CORS.** CORS mengatur siapa yang boleh *membaca* respons, bukan melindungi halamanmu. Lihat
  [13 Web Security](/roadmap/13-web-security).

## Konsep terkait

[13 Web Security](/roadmap/13-web-security) (XSS, CSP, clickjacking),
[14 Authentication](/roadmap/14-authentication) (cookie dan HTTPS), dan
[deep dive Observability front-end](/deep-dives/observability) (mengumpulkan laporan pelanggaran CSP).

## Belajar dari source-nya

Latihan yang disarankan: baca
[`securityHeaders.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/security-headers/src/securityHeaders.ts),
lalu jawab sebelum melihat test-nya. Kenapa `strictCsp` memvalidasi nonce, padahal nonce dibuat
oleh server sendiri? Kenapa `frame-ancestors` tidak bisa dipasang lewat `<meta http-equiv>`? Apa
yang terjadi pada pengguna kalau HSTS dengan `max-age` 2 tahun dipasang, lalu sertifikat HTTPS-mu
kedaluwarsa?
