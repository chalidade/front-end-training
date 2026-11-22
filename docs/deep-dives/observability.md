# Deep Dive: Observability Front-end, Error Tracking, RUM, Tracing

> Terkait: [16 Performance](../roadmap/16-performance.md). Deep dive lain:
> [Browser Rendering Pipeline](browser-rendering-pipeline.md), [Module bundler dari nol](module-bundler.md),
> [HTTP Caching](http-caching.md)

## Pertanyaan pembuka

Di laptopmu semuanya cepat dan tidak ada error. Lalu seorang pengguna menulis "checkout-nya tidak
bisa diklik" dan tidak ada log apa pun di server. Error tracker hanya mencatat `Script error.` di
baris 0. Stack trace yang ada menunjuk ke `app.js:1:24`, satu baris berisi 80 KB kode. Lighthouse
memberi skor 98, tapi pengguna mengeluh halaman "loncat-loncat". Bagaimana kamu bisa tahu apa yang
sebenarnya terjadi di jutaan browser yang tidak bisa kamu buka?

## Model mental

Server berjalan di mesin yang kamu kendalikan. Front-end berjalan di **lingkungan yang tidak kamu
kendalikan**: ribuan kombinasi perangkat, browser, ekstensi, jaringan, dan versi deploy yang masih
tersimpan di cache. Observability front-end berarti **membawa sinyal dari browser pengguna kembali
kepadamu**, cukup lengkap untuk menjawab pertanyaan yang belum kamu pikirkan saat menulis kodenya.

Ada tiga jenis sinyal, dan masing-masing menjawab pertanyaan berbeda:

| Sinyal | Pertanyaan | Contoh di front-end |
| --- | --- | --- |
| **Error** | apa yang rusak, di mana, untuk siapa? | exception, promise rejection, request gagal, resource 404 |
| **Metrik (RUM)** | seberapa baik pengalaman pengguna, secara agregat? | LCP, INP, CLS, TTFB, per halaman, perangkat, negara |
| **Trace** | ke mana waktu satu aksi habis, lintas sistem? | klik "Bayar" → fetch → API gateway → service → database |

Ketiganya berbeda dari **lab data** (Lighthouse, WebPageTest) yang diukur di satu mesin dengan
kondisi terkontrol. Lab data bagus untuk mencari penyebab. Field data dari pengguna nyata
(*Real User Monitoring*) adalah satu-satunya yang menjawab "apakah pengguna merasakan masalah?".

Alurnya selalu sama: **tangkap → perkaya dengan konteks → kirim dengan murah → olah di server**.

## Mekanisme detail

### 1. Menangkap error

Browser memberi beberapa titik tangkap global:

```js
addEventListener("error", (e) => report({ message: e.message, stack: e.error?.stack }));
addEventListener("unhandledrejection", (e) => report({ message: String(e.reason), stack: e.reason?.stack }));
// Resource yang gagal dimuat (img, script) memicu "error" di elemennya, tidak bubble.
// Tangkap di fase capture untuk melihatnya:
addEventListener("error", (e) => { if (e.target !== window) report({ resource: e.target.src }); }, true);
```

Sisanya harus ditangkap sendiri: error yang sudah di-`catch` oleh kode aplikasi, error boundary di
React (`componentDidCatch`), dan `fetch` yang berhasil secara jaringan tapi mengembalikan status 500.
`fetch` hanya reject untuk kegagalan jaringan, bukan untuk status HTTP.

### 2. `Script error.`: kebijakan same-origin untuk error

Kalau script dimuat dari origin lain (CDN, domain statis) **tanpa** izin CORS, browser
menyembunyikan detail error-nya. `message` menjadi `"Script error."`, `filename` kosong, baris 0,
dan `error` bernilai `null`. Ini disengaja (spec HTML menyebutnya *muted errors*): tanpa itu,
halaman jahat bisa memuat script dari situs lain sebagai `<script>` dan membaca isi pesan error-nya
untuk membocorkan data.

Perbaikannya butuh dua sisi: atribut `crossorigin="anonymous"` di tag `<script>`, **dan** header
`Access-Control-Allow-Origin` dari server CDN. Salah satu saja tidak cukup. Hasilnya ada di
Eksperimen 1.

### 3. Source map: dari `app.js:1:24` ke `cart.ts:4:16`

Stack trace dari produksi menunjuk ke kode yang sudah di-bundle dan di-minify. Source map adalah
file JSON yang memetakan setiap posisi (baris, kolom) di output ke posisi di file aslinya, plus
nama asli fungsi dan variabel. Formatnya kini distandarkan sebagai ECMA-426. Pemetaan disimpan
dalam field `mappings` sebagai VLQ base64, dengan setiap segmen menyimpan *selisih* dari segmen
sebelumnya supaya file tetap kecil.

Proses menerjemahkan stack trace disebut **symbolication**, dan dikerjakan di server error tracker,
bukan di browser pengguna. Karena itu praktik umumnya:

- Build menghasilkan source map (`sourcemap: true` atau `"hidden"`).
- Map **diunggah ke error tracker** dengan penanda rilis (misalnya hash commit), lalu **tidak
  dipublikasikan** ke CDN kalau kamu tidak ingin source code terbaca publik.
- Setiap event error membawa penanda rilis yang sama, supaya tracker memakai map dari build yang
  benar. Map dari build lain akan menunjuk ke baris yang salah dengan sangat meyakinkan.

### 4. RUM: mengukur pengalaman pengguna nyata

Browser menyediakan angka performa lewat `PerformanceObserver`:

| Metrik | Entry type | Apa yang diukur | Ambang "baik" (p75) |
| --- | --- | --- | --- |
| **LCP** | `largest-contentful-paint` | kapan elemen konten terbesar selesai digambar | ≤ 2,5 s |
| **INP** | `event` (dengan `durationThreshold`) | latensi interaksi terburuk (kurang lebih) selama kunjungan | ≤ 200 ms |
| **CLS** | `layout-shift` | total pergeseran layout yang tidak diduga, per *session window* | ≤ 0,1 |
| **TTFB** | `navigation` | waktu sampai byte pertama respons dokumen | ≤ 0,8 s |

Detailnya lebih rumit daripada kelihatannya. CLS bukan jumlah semua pergeseran, melainkan jendela
sesi terburuk (pergeseran yang berdekatan, maksimal 5 detik, dengan jeda kurang dari 1 detik).
Pergeseran dalam 500 ms setelah input pengguna tidak dihitung (`hadRecentInput`). Halaman yang
dipulihkan dari back/forward cache harus dihitung sebagai kunjungan baru. Karena itu, di produksi
pakai library [`web-vitals`](https://github.com/GoogleChrome/web-vitals) alih-alih menulis sendiri.
Eksperimen 3 menunjukkan mekanisme dasarnya.

Angka RUM baru bermakna setelah **diagregasi**: laporkan persentil (p75 seperti Core Web Vitals,
lalu p95), bukan rata-rata, dan pecah per halaman, tipe perangkat, dan koneksi. Rata-rata
menyembunyikan pengguna di ekor distribusi, padahal di sanalah masalahnya.

### 5. Mengirim data tanpa merusak halaman

Data observability tidak boleh menjadi masalah performa baru:

- **Kirim saat `visibilitychange` menjadi `hidden`**, bukan saat `unload` atau `beforeunload`. Di
  mobile, pengguna sering menutup tab dari task switcher dan `unload` tidak pernah dipanggil.
  `unload` juga membuat halaman tidak bisa masuk back/forward cache.
- **Pakai `navigator.sendBeacon`** (atau `fetch(..., { keepalive: true })`): request tetap dikirim
  walaupun halaman sedang ditutup, dan tidak menahan navigasi.
- **Batch dan sampling.** Kirim beberapa event sekaligus. Untuk metrik, sampling 10% sering sudah
  cukup secara statistik. Untuk error, lakukan deduplikasi agar satu bug di loop tidak mengirim
  10.000 event.
- **Privasi.** Jangan kirim isi form, token, atau data pribadi. Bersihkan query string dan pesan
  error sebelum dikirim. Hormati consent.

### 6. Tracing: menyambung browser ke backend

Satu klik bisa memicu beberapa request yang melewati gateway, beberapa service, dan database.
**Distributed tracing** memberi satu ID ke seluruh perjalanan itu. Standar W3C Trace Context
mendefinisikan header `traceparent`:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  └──────── trace-id (16 byte) ───────┘ └ parent-id (8 byte) ┘ └ flags (01 = sampled)
             └ versi
```

Browser membuat (atau menerima dari server lewat `<meta>`) `trace-id`, menyertakannya di setiap
`fetch`, dan setiap service meneruskannya ke service berikutnya. Hasilnya satu "air terjun" span
dari klik sampai query database. OpenTelemetry menyediakan SDK browser yang melakukan instrumentasi
`fetch`, `XMLHttpRequest`, dan document load secara otomatis.

Dua jebakan: header `traceparent` ke origin lain memicu **preflight CORS**, dan server harus
mengizinkannya lewat `Access-Control-Allow-Headers: traceparent`. Lalu, sambungkan juga ID trace ke
event error dan RUM, supaya dari satu error kamu bisa melompat ke trace backend-nya.

### 7. Dari data ke tindakan

Data tanpa keputusan hanyalah biaya penyimpanan. Beberapa kebiasaan yang membuat observability
berguna:

- **Kelompokkan error berdasarkan fingerprint** (pesan + frame teratas setelah symbolication),
  lalu urutkan berdasarkan jumlah **pengguna** yang terdampak, bukan jumlah event.
- **Tandai setiap event dengan versi rilis.** Pertanyaan pertama saat insiden hampir selalu "mulai
  dari deploy yang mana?".
- **Pasang alert pada perubahan**, misalnya p75 LCP naik 20% setelah deploy, atau error rate rilis
  baru dua kali lipat rilis sebelumnya, bukan pada angka absolut yang selalu berisik.
- **Bedakan noise dari sinyal.** Ekstensi browser, bot, dan browser lama menghasilkan banyak error
  yang bukan milikmu. Filter berdasarkan origin script dan user agent.

## Eksperimen

Eksperimen 1 dan 3 dijalankan di Chromium lewat Playwright, dengan `page.route` meniru origin
aplikasi, CDN, dan endpoint pengumpul. Eksperimen 2 memakai esbuild 0.27.7 dan class `SourceMap`
bawaan Node 22 (`node:module`), tanpa dependency tambahan. Semua output adalah hasil asli.

**1. `Script error.` vs `crossorigin`.** Script yang sama dimuat dua kali dari origin CDN: sekali
tanpa CORS, sekali dengan `crossorigin="anonymous"` dan header `Access-Control-Allow-Origin`.

```js
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const widget = `function hitungTotal(items) { return items.reduce((a, b) => a + b.harga, 0); }
setTimeout(() => hitungTotal(null), 0);`;
  await page.route("https://app.test/**", (r) => r.fulfill({ contentType: "text/html", body: `<!doctype html>
    <script>
      window.reports = [];
      window.addEventListener("error", (e) =>
        reports.push({ message: e.message, source: e.filename, line: e.lineno, hasError: !!e.error }));
    </script>
    <script src="https://cdn.test/a.js"></script>
    <script src="https://cdn.test/b.js" crossorigin="anonymous"></script>` }));
  await page.route("https://cdn.test/a.js", (r) => r.fulfill({ contentType: "text/javascript", body: widget }));
  await page.route("https://cdn.test/b.js", (r) => r.fulfill({
    contentType: "text/javascript", body: widget, headers: { "Access-Control-Allow-Origin": "*" } }));
  await page.goto("https://app.test/");
  await page.waitForTimeout(100);
  console.log(await page.evaluate(() => reports));
  await browser.close();
})();
```

```
[
  { message: 'Script error.', source: '', line: 0, hasError: false },
  {
    message: "Uncaught TypeError: Cannot read properties of null (reading 'reduce')",
    source: 'https://cdn.test/b.js',
    line: 1,
    hasError: true
  }
]
```

Bug yang sama, dua laporan yang sangat berbeda. Laporan pertama tidak bisa ditindaklanjuti sama
sekali. Di browser nyata, atribut `crossorigin` tanpa header `Access-Control-Allow-Origin` justru
lebih buruk: request CORS-nya gagal dan script tidak dijalankan sama sekali. Efek itu tidak
terlihat di eksperimen ini, karena respons yang dipalsukan lewat `page.route` di Playwright tidak
melewati pemeriksaan CORS. Saat menguji perilaku CORS, pakai server sungguhan.

**2. Symbolication dengan source map.** Dua file TypeScript di-bundle dan di-minify oleh esbuild.

```ts
// src/cart.ts
interface Item { name: string; price: number }

export function totalPrice(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// src/main.ts
import { totalPrice } from "./cart";

const cartFromApi = JSON.parse('{"items": null}');
console.log(totalPrice(cartFromApi.items));
```

```js
// build.mjs
import { build } from "esbuild";
await build({ entryPoints: ["src/main.ts"], bundle: true, minify: true, sourcemap: true,
  outfile: "dist/app.js", platform: "node", format: "esm" });
```

Output `dist/app.js` dan stack trace mentahnya:

```
function e(r){return r.reduce((t,i)=>t+i.price,0)}var n=JSON.parse('{"items": null}');console.log(e(n.items));

TypeError: Cannot read properties of null (reading 'reduce')
    at e (dist/app.js:1:24)
    at Object.<anonymous> (dist/app.js:1:99)
```

Inilah yang diterima error tracker: fungsi bernama `e` di baris 1. Symbolication-nya, dengan class
`SourceMap` bawaan Node:

```js
// symbolicate.mjs
import { readFileSync } from "node:fs";
import { SourceMap } from "node:module";

const frame = process.argv[2]; // contoh "app.js:1:24"
const [, line, column] = frame.split(":").map(Number);
const map = new SourceMap(JSON.parse(readFileSync("dist/app.js.map", "utf8")));
const e = map.findEntry(line - 1, column - 1); // findEntry memakai offset berbasis 0
console.log(`${frame}  →  ${e.originalSource}:${e.originalLine + 1}:${e.originalColumn + 1}${e.name ? ` (${e.name})` : ""}`);
```

```
$ node symbolicate.mjs app.js:1:24
app.js:1:24  →  ../src/cart.ts:4:16
$ node symbolicate.mjs app.js:1:99
app.js:1:99  →  ../src/main.ts:4:13 (totalPrice)
```

Bandingkan dengan `node --enable-source-maps dist/app.js`, yang melakukan hal yang sama secara
otomatis:

```
TypeError: Cannot read properties of null (reading 'reduce')
    at totalPrice (src/cart.ts:4:16)
    at Object.<anonymous> (src/main.ts:4:13)
```

Perhatikan bahwa nama `totalPrice` muncul di frame **pemanggil** (`main.ts:4:13`, tempat `e(...)`
dipanggil). Frame teratas hanya punya posisi. Itulah alasan error tracker membaca nama fungsi dari
pemetaan di posisi pemanggilan. Coba build ulang setelah menambah satu baris di `cart.ts` tanpa
memperbarui map: posisi yang dihasilkan tetap "valid" tapi menunjuk ke baris yang salah.

**3. Web Vitals, beacon, dan `traceparent` dalam satu halaman.** Halaman produk dengan banner yang
disisipkan terlambat, metrik dikirim lewat `sendBeacon` saat halaman disembunyikan, dan `fetch`
yang membawa header `traceparent`.

```js
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const beacons = [];
  await page.route("https://shop.test/**", async (r) => {
    const req = r.request();
    if (req.url().endsWith("/rum")) { beacons.push(JSON.parse(req.postData())); return r.fulfill({ status: 204 }); }
    if (req.url().endsWith("/api/cart")) {
      beacons.push({ apiTraceparent: req.headers()["traceparent"] });
      return r.fulfill({ contentType: "application/json", body: "[]" });
    }
    r.fulfill({ contentType: "text/html", body: `<!doctype html><body style="margin:0">
      <h1 id="hero" style="font-size:64px;margin:0">Diskon akhir pekan</h1>
      <p>Konten utama</p>
      <script>
        const metrics = { cls: 0, lcp: 0, shifts: [] };
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.hadRecentInput) continue;      // geser karena input user tidak dihitung
            metrics.cls += e.value;
            metrics.shifts.push(+e.value.toFixed(4));
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          const last = list.getEntries().at(-1);
          metrics.lcp = Math.round(last.startTime);
          metrics.lcpElement = last.element?.id || last.element?.tagName;
        }).observe({ type: "largest-contentful-paint", buffered: true });

        // W3C Trace Context: 00-<trace-id 16 byte>-<span-id 8 byte>-<flags>
        const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
        const traceId = hex(16);
        metrics.traceparent = "00-" + traceId + "-" + hex(8) + "-01";
        fetch("/api/cart", { headers: { traceparent: metrics.traceparent } });

        // Banner yang disisipkan terlambat mendorong konten ke bawah: layout shift.
        setTimeout(() => {
          const banner = document.createElement("div");
          banner.style.height = "300px";
          banner.textContent = "Banner promo";
          document.body.prepend(banner);
        }, 300);

        // Kirim saat halaman disembunyikan: satu-satunya momen yang andal di mobile.
        addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") {
            navigator.sendBeacon("/rum", JSON.stringify({ ...metrics, cls: +metrics.cls.toFixed(4), page: location.pathname }));
          }
        });
      </script>` });
  });
  await page.goto("https://shop.test/produk");
  await page.waitForTimeout(800);
  // Tiru user pindah tab / menutup halaman.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  console.log(JSON.stringify(beacons, null, 2));
  await browser.close();
})();
```

```
[
  {
    "apiTraceparent": "00-bddc4355b897dbbe7b48f80e75d6a751-52317d8a66360232-01"
  },
  {
    "cls": 0.0599,
    "lcp": 32,
    "shifts": [
      0.0599
    ],
    "traceparent": "00-bddc4355b897dbbe7b48f80e75d6a751-52317d8a66360232-01",
    "lcpElement": "hero",
    "page": "/produk"
  }
]
```

ID trace dan nilai LCP akan berbeda di setiap run. Yang penting:

- **Header `traceparent` yang diterima API sama persis dengan yang dikirim di beacon RUM.** Di
  sistem nyata, ID itulah yang menyambungkan sesi lambat di dashboard RUM ke trace backend-nya.
- **Banner setinggi 300 px hanya menghasilkan CLS 0,06.** Skor layout shift adalah *impact
  fraction × distance fraction*: yang bergeser hanya judul dan satu paragraf, area kecil dari
  viewport 1280×720. Tambahkan `<div style="height:720px">` di bawah paragraf, dan banner yang sama
  menghasilkan CLS 0,224, jauh di atas ambang 0,1.
- **LCP 32 ms itu lab data** dari headless Chromium tanpa throttling, tidak mewakili pengguna.
  Itulah alasan RUM ada.

Catat hasil dan kejutannya di [catatan eksperimen](/notes/). Tantangan berikutnya: ganti
`PerformanceObserver` buatan sendiri dengan `onLCP`, `onINP`, dan `onCLS` dari library
`web-vitals`, lalu bandingkan angkanya setelah kamu menggulir dan mengklik halaman.

## Implikasi praktis

- **Pasang `crossorigin="anonymous"` dan header CORS untuk semua script dari CDN.** Tanpa itu,
  error tracker-mu buta terhadap kodemu sendiri.
- **Unggah source map ke error tracker per rilis, jangan publikasikan kalau tidak perlu,** dan
  tandai setiap event dengan versi rilis yang sama.
- **Tangkap lebih dari `window.onerror`:** `unhandledrejection`, error resource (fase capture),
  error boundary, dan respons HTTP yang gagal.
- **Ukur di lapangan dengan `web-vitals`**, laporkan p75 per halaman dan perangkat, dan pakai lab
  data untuk mencari penyebab, bukan untuk menilai pengalaman pengguna.
- **Kirim lewat `sendBeacon` saat `visibilitychange` → `hidden`;** hindari `unload`.
- **Sambungkan front-end ke backend dengan `traceparent`,** dan izinkan header itu di CORS.
- **Batasi volume dan jaga privasi:** sampling, batching, deduplikasi, dan bersihkan data pribadi
  sebelum dikirim.
- **Alert pada regresi setelah deploy**, bukan pada angka absolut, dan urutkan bug berdasarkan
  jumlah pengguna terdampak.

## Sumber primer

- [HTML spec: runtime script errors](https://html.spec.whatwg.org/multipage/webappapis.html#runtime-script-errors)
  (termasuk *muted errors*) dan [MDN: atribut `crossorigin`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)
- [ECMA-426: Source map format](https://tc39.es/ecma426/) dan
  [Node.js: `module.SourceMap`](https://nodejs.org/api/module.html#class-modulesourcemap)
- [web.dev: Web Vitals](https://web.dev/articles/vitals), [CLS](https://web.dev/articles/cls), dan
  [INP](https://web.dev/articles/inp)
- [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) dan
  [OpenTelemetry: Browser](https://opentelemetry.io/docs/languages/js/getting-started/browser/)
- [MDN: `Navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) dan
  [Chrome: Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- Charity Majors, Liz Fong-Jones, George Miranda, *Observability Engineering* (O'Reilly)
