# @chalidade/fetch

`fetch` dengan timeout per percobaan dan retry untuk kegagalan sementara, tanpa dependensi.

```ts
import { fetchWithRetry, TimeoutError } from "@chalidade/fetch";

const res = await fetchWithRetry("/api/produk", { timeout: 5000, retries: 2 });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
```

- Retry hanya untuk error jaringan, timeout, dan status 408/425/429/500/502/503/504.
- Hanya metode idempoten (GET, HEAD, OPTIONS, PUT, DELETE) yang dicoba ulang. POST tidak.
- Jeda: header `Retry-After` kalau ada, kalau tidak backoff eksponensial dengan full jitter.
- `signal` dari pemanggil menghentikan request dan jeda retry seketika, tanpa retry.
- Seperti `fetch`, respons non-2xx dikembalikan, bukan dilempar.

Dokumentasi lengkap: https://chalidade.github.io/front-end-training/toolkit/fetch
