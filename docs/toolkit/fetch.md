# @chalidade/fetch

`fetch` dengan timeout per percobaan dan retry untuk kegagalan sementara. Tanpa dependensi, sekitar
100 baris, dan sengaja ditulis supaya bisa dibaca.

```bash
pnpm add @chalidade/fetch
# atau
npm install @chalidade/fetch
```

::: warning Belum dipublish
Package ini belum dipublish ke npm. Sementara ini, salin source-nya dari
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/fetch/src).
:::

## Kenapa tidak `fetch` saja?

`fetch` bawaan tidak punya timeout: request ke server yang macet bisa menggantung sampai browser
menyerah, dan itu bisa makan menit. `fetch` juga tidak mencoba ulang apa pun, padahal di jaringan
seluler banyak kegagalan yang hanya sementara (koneksi terputus sesaat, 503 saat deploy, 429 saat
rate limit). Menulis retry sendiri terlihat mudah, tapi ada beberapa jebakan:

- **Mencoba ulang POST** bisa membuat pesanan ganda. Hanya metode idempoten yang aman diulang.
- **Retry serentak** dari ribuan klien setelah server pulih bisa menjatuhkannya lagi
  (*thundering herd*). Jeda harus diacak (*jitter*), bukan tetap.
- **Server sudah bilang kapan harus kembali** lewat header `Retry-After`. Abaikan itu dan kamu
  memperpanjang rate limit-mu sendiri.
- **Pembatalan dari pengguna** (pindah halaman, mengetik ulang pencarian) tidak boleh memicu retry.

## API

### `fetchWithRetry(input, options?)`

Signature-nya sama dengan `fetch`, ditambah beberapa opsi:

| Opsi | Default | Arti |
| --- | --- | --- |
| `timeout` | `10000` | batas waktu **per percobaan** dalam ms; `0` mematikannya |
| `retries` | `2` | jumlah percobaan ulang setelah percobaan pertama |
| `retryDelay` | `300` | dasar backoff; jeda ke-n diacak antara 0 dan `retryDelay × 2ⁿ` ms |
| `maxDelay` | `10000` | batas atas jeda, termasuk dari `Retry-After` |
| `retryOn` | `[408, 425, 429, 500, 502, 503, 504]` | status HTTP yang dicoba ulang |
| `retryMethods` | `["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]` | metode yang boleh dicoba ulang |
| `fetch` | `globalThis.fetch` | implementasi fetch, berguna untuk test |

```ts
import { fetchWithRetry, TimeoutError } from "@chalidade/fetch";

const controller = new AbortController();

try {
  const res = await fetchWithRetry("/api/produk?q=sepatu", {
    timeout: 5000,
    retries: 3,
    signal: controller.signal, // controller.abort() menghentikan request dan jeda retry
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  render(await res.json());
} catch (error) {
  if (error instanceof TimeoutError) showToast("Server lambat, coba lagi sebentar lagi");
  else if (controller.signal.aborted) return; // dibatalkan sendiri, abaikan
  else throw error;
}
```

Perilakunya:

1. Setiap percobaan punya `AbortController` sendiri. Timeout membatalkannya dengan
   `TimeoutError`; `signal` milikmu diteruskan ke sana.
2. Error jaringan (`TypeError` dari `fetch`) dan `TimeoutError` dianggap sementara dan dicoba ulang.
   Error lain langsung dilempar.
3. Status di `retryOn` dicoba ulang. Setelah percobaan habis, **respons terakhir dikembalikan**,
   persis seperti `fetch`. Kamu tetap memeriksa `res.ok`.
4. Jeda memakai `Retry-After` (detik atau tanggal HTTP) kalau server mengirimnya. Kalau tidak,
   backoff eksponensial dengan *full jitter*.
5. Kalau `signal` milikmu dibatalkan, baik saat request berjalan maupun saat menunggu jeda, promise
   langsung reject dengan `signal.reason` dan tidak ada retry.
6. Request dengan body berupa `ReadableStream` tidak pernah dicoba ulang, karena stream hanya bisa
   dibaca sekali.

### `TimeoutError`

Error yang dilempar saat satu percobaan melewati `timeout`. Punya properti `timeout` (ms).

### `parseRetryAfter(value, now?)` dan `delayFor(attempt, base, max, response?)`

Fungsi pembantu yang diekspor supaya bisa dipakai ulang dan diuji: `parseRetryAfter("120")` →
`120000`, `parseRetryAfter("Wed, 25 Nov 2026 00:00:30 GMT")` → ms sampai waktu itu.

## Yang sengaja tidak ada

- **Refresh token.** Antrean refresh untuk banyak request paralel adalah proyek latihan "Deep" di
  [14 Authentication](/roadmap/14-authentication). Coba bangun di atas paket ini.
- **Cache dan dedup.** Itu tugas library server state seperti TanStack Query. Lihat
  [deep dive State management](/deep-dives/state-management).
- **Melempar error untuk status non-2xx.** Supaya tetap kompatibel dengan `fetch`.

## Konsep terkait

[14 Authentication](/roadmap/14-authentication), [19 GraphQL & Data Fetching](/roadmap/19-graphql-data-fetching),
[deep dive Observability front-end](/deep-dives/observability) (mengukur request yang gagal), dan
[HTTP Caching](/deep-dives/http-caching).

## Belajar dari source-nya

Latihan yang disarankan: baca
[`fetchWithRetry.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/fetch/src/fetchWithRetry.ts),
lalu jawab tiga pertanyaan ini sebelum melihat test-nya. Kenapa `signal.aborted` diperiksa
**sebelum** `isTransient`? Apa yang terjadi kalau `Math.random()` dihapus dari `delayFor` dan 10.000
klien gagal bersamaan? Kenapa `PUT` boleh dicoba ulang tapi `PATCH` tidak?
