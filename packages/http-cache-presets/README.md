# @chalidade/http-cache-presets

Builder dan preset header `Cache-Control`, tanpa dependensi.

```ts
import { cacheControl, cachePresets, presetFor, publicApi } from "@chalidade/http-cache-presets";

cachePresets.immutable; // "public, max-age=31536000, immutable"  aset ber-hash
cachePresets.revalidate; // "no-cache"                            HTML, aset tanpa hash
cachePresets.private; // "private, no-cache"                      respons per user
cachePresets.sensitive; // "no-store"                             token, data bank
publicApi("1m", "10m"); // "public, max-age=60, stale-while-revalidate=600"
presetFor("/app.3f9a1c7e.js"); // immutable; selain nama ber-hash → revalidate
cacheControl({ public: true, maxAge: "1h", sMaxAge: "1d" }); // "public, max-age=3600, s-maxage=86400"
```

`cacheControl` melempar Error untuk `public` + `private`, `noStore` dengan directive lain,
`immutable` tanpa `maxAge`, `private` + `sMaxAge`, dan durasi negatif.

Dokumentasi lengkap: https://chalidade.github.io/front-end-training/toolkit/http-cache-presets
