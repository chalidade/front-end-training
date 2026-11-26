---
"@chalidade/http-cache-presets": minor
---

Paket baru: `cacheControl` yang menyusun header `Cache-Control` dan menolak kombinasi kontradiktif (public + private, no-store dengan directive lain, immutable tanpa max-age), durasi berunit (`"1h"`, `"1y"`), `cachePresets` (immutable, revalidate, private, sensitive), `publicApi` dengan stale-while-revalidate, dan `presetFor` yang memilih preset dari path.
