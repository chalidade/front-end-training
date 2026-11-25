# @chalidade/security-headers

Preset header keamanan HTTP dengan default aman, tanpa dependensi. Hasilnya objek biasa
`{ nama: nilai }` untuk Next.js, Vite, atau Express.

```ts
import { buildCsp, createNonce, securityHeaders, strictCsp } from "@chalidade/security-headers";

securityHeaders(); // CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP
securityHeaders({ hsts: false, cspReportOnly: true }); // untuk development
buildCsp(strictCsp(createNonce())); // CSP strict ber-nonce, nonce baru per respons
```

- `buildCsp` melempar Error untuk keyword tanpa kutip (`self` alih-alih `'self'`), source berisi
  spasi/`;`/`,`, daftar kosong, dan nama directive yang salah.
- HSTS `preload` hanya diizinkan kalau `maxAge ≥ 31536000` dan `includeSubDomains: true`.
- Setiap header bisa diganti atau dimatikan dengan `false`.

Dokumentasi lengkap: https://chalidade.github.io/front-end-training/toolkit/security-headers
