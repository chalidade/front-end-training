# Deep Dive: Front-end Observability, Error Tracking, RUM, Tracing

> Related: [16 Performance](../roadmap/16-performance.md). Other deep dives:
> [Browser Rendering Pipeline](browser-rendering-pipeline.md), [A module bundler from scratch](module-bundler.md),
> [HTTP Caching](http-caching.md)

## Opening questions

On your laptop everything is fast and error-free. Then a user writes "I can't click checkout" and
there's nothing in the server logs. The error tracker only recorded `Script error.` on line 0. The
stack traces you do have point to `app.js:1:24`, a single line holding 80 KB of code. Lighthouse
scores 98, but users complain the page "jumps around". How can you know what actually happens in
millions of browsers you can't open?

## Mental model

Servers run on machines you control. The front-end runs in **an environment you don't control**:
thousands of combinations of devices, browsers, extensions, networks, and deploy versions still
sitting in caches. Front-end observability means **bringing signals from users' browsers back to
you**, complete enough to answer questions you hadn't thought of when you wrote the code.

There are three kinds of signal, and each answers a different question:

| Signal | Question | Front-end examples |
| --- | --- | --- |
| **Errors** | what broke, where, for whom? | exceptions, promise rejections, failed requests, 404 resources |
| **Metrics (RUM)** | how good is the user experience, in aggregate? | LCP, INP, CLS, TTFB, per page, device, country |
| **Traces** | where did the time of one action go, across systems? | click "Pay" → fetch → API gateway → service → database |

All three differ from **lab data** (Lighthouse, WebPageTest), measured on one machine under
controlled conditions. Lab data is good for finding causes. Field data from real users (*Real User
Monitoring*) is the only thing that answers "do users feel the problem?".

The flow is always the same: **capture → enrich with context → send cheaply → process on the
server**.

## Detailed mechanism

### 1. Capturing errors

The browser offers a few global capture points:

```js
addEventListener("error", (e) => report({ message: e.message, stack: e.error?.stack }));
addEventListener("unhandledrejection", (e) => report({ message: String(e.reason), stack: e.reason?.stack }));
// A resource that fails to load (img, script) fires "error" on its element, and it doesn't bubble.
// Listen in the capture phase to see it:
addEventListener("error", (e) => { if (e.target !== window) report({ resource: e.target.src }); }, true);
```

The rest you have to capture yourself: errors the app already `catch`es, React error boundaries
(`componentDidCatch`), and a `fetch` that succeeds at the network level but returns a 500. `fetch`
only rejects on network failure, not on HTTP status.

### 2. `Script error.`: the same-origin policy for errors

If a script is loaded from another origin (a CDN, a static domain) **without** CORS permission, the
browser hides its error details. `message` becomes `"Script error."`, `filename` is empty, the line
is 0, and `error` is `null`. This is deliberate (the HTML spec calls them *muted errors*): without
it, a malicious page could load another site's script as a `<script>` and read its error messages
to leak data.

The fix needs both sides: the `crossorigin="anonymous"` attribute on the `<script>` tag **and** an
`Access-Control-Allow-Origin` header from the CDN. Either one alone isn't enough. The result is in
Experiment 1.

### 3. Source maps: from `app.js:1:24` to `cart.ts:4:16`

Production stack traces point to bundled, minified code. A source map is a JSON file that maps every
position (line, column) in the output to a position in the original file, plus the original names
of functions and variables. The format is now standardized as ECMA-426. The mapping lives in the
`mappings` field as base64 VLQ, with each segment storing the *difference* from the previous one to
keep the file small.

Translating a stack trace is called **symbolication**, and it happens on the error tracker's
server, not in the user's browser. So the usual practice is:

- The build emits source maps (`sourcemap: true` or `"hidden"`).
- The maps are **uploaded to the error tracker** with a release marker (for example a commit hash)
  and **not published** to the CDN if you don't want your source code publicly readable.
- Every error event carries the same release marker, so the tracker uses the map from the right
  build. A map from another build points to the wrong line, very convincingly.

### 4. RUM: measuring real user experience

The browser exposes performance numbers through `PerformanceObserver`:

| Metric | Entry type | What it measures | "Good" threshold (p75) |
| --- | --- | --- | --- |
| **LCP** | `largest-contentful-paint` | when the largest content element finished painting | ≤ 2.5 s |
| **INP** | `event` (with `durationThreshold`) | roughly the worst interaction latency during the visit | ≤ 200 ms |
| **CLS** | `layout-shift` | total unexpected layout shift, per *session window* | ≤ 0.1 |
| **TTFB** | `navigation` | time until the first byte of the document response | ≤ 0.8 s |

The details are trickier than they look. CLS isn't the sum of every shift but the worst session
window (shifts close together, at most 5 seconds long, with gaps under 1 second). Shifts within
500 ms of user input don't count (`hadRecentInput`). Pages restored from the back/forward cache
must be counted as new visits. So in production, use the
[`web-vitals`](https://github.com/GoogleChrome/web-vitals) library instead of rolling your own.
Experiment 3 shows the basic mechanism.

RUM numbers only mean something once **aggregated**: report percentiles (p75 like Core Web Vitals,
then p95), not averages, and break them down by page, device type, and connection. Averages hide
the users in the tail of the distribution, and that's where the problems are.

### 5. Sending data without hurting the page

Observability data must not become a new performance problem:

- **Send when `visibilitychange` turns `hidden`**, not on `unload` or `beforeunload`. On mobile,
  users often close tabs from the task switcher and `unload` never fires. `unload` also keeps the
  page out of the back/forward cache.
- **Use `navigator.sendBeacon`** (or `fetch(..., { keepalive: true })`): the request still goes out
  while the page is closing, and it doesn't hold up navigation.
- **Batch and sample.** Send several events at once. For metrics, a 10% sample is often
  statistically enough. For errors, deduplicate so one bug in a loop doesn't send 10,000 events.
- **Privacy.** Don't send form contents, tokens, or personal data. Scrub query strings and error
  messages before sending. Respect consent.

### 6. Tracing: connecting the browser to the backend

A single click can trigger several requests that pass through a gateway, several services, and a
database. **Distributed tracing** gives the whole journey one ID. The W3C Trace Context standard
defines the `traceparent` header:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  └──────── trace-id (16 byte) ───────┘ └ parent-id (8 byte) ┘ └ flags (01 = sampled)
             └ version
```

The browser creates a `trace-id` (or receives one from the server via a `<meta>` tag), includes it
in every `fetch`, and every service passes it on to the next. The result is one "waterfall" of
spans from the click down to the database query. OpenTelemetry provides a browser SDK that
instruments `fetch`, `XMLHttpRequest`, and document load automatically.

Two traps: a `traceparent` header to another origin triggers a **CORS preflight**, and the server
must allow it with `Access-Control-Allow-Headers: traceparent`. And attach the trace ID to error
and RUM events too, so that from one error you can jump to its backend trace.

### 7. From data to action

Data without decisions is just storage cost. A few habits that make observability useful:

- **Group errors by fingerprint** (message + top frame after symbolication), then sort by the number
  of affected **users**, not the number of events.
- **Tag every event with the release version.** The first question in an incident is almost always
  "starting with which deploy?".
- **Alert on change**, for example p75 LCP rising 20% after a deploy, or a new release's error rate
  doubling the previous one's, not on absolute numbers that are always noisy.
- **Separate noise from signal.** Browser extensions, bots, and old browsers produce lots of errors
  that aren't yours. Filter by script origin and user agent.

## Experiments

Experiments 1 and 3 run in Chromium via Playwright, with `page.route` faking the app origin, the
CDN, and the collection endpoint. Experiment 2 uses esbuild 0.27.7 and Node 22's built-in
`SourceMap` class (`node:module`), with no extra dependencies. All output is real.

**1. `Script error.` vs `crossorigin`.** The same script is loaded twice from the CDN origin: once
without CORS, once with `crossorigin="anonymous"` and an `Access-Control-Allow-Origin` header.

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

Same bug, two very different reports. The first can't be acted on at all. In a real browser, the
`crossorigin` attribute without an `Access-Control-Allow-Origin` header is even worse: the CORS
request fails and the script doesn't run at all. That effect doesn't show up in this experiment,
because responses faked with Playwright's `page.route` skip the CORS check. Use a real server when
testing CORS behavior.

**2. Symbolication with a source map.** Two TypeScript files are bundled and minified by esbuild.

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

The output `dist/app.js` and its raw stack trace:

```
function e(r){return r.reduce((t,i)=>t+i.price,0)}var n=JSON.parse('{"items": null}');console.log(e(n.items));

TypeError: Cannot read properties of null (reading 'reduce')
    at e (dist/app.js:1:24)
    at Object.<anonymous> (dist/app.js:1:99)
```

This is what the error tracker receives: a function named `e` on line 1. Symbolicating it with
Node's built-in `SourceMap` class:

```js
// symbolicate.mjs
import { readFileSync } from "node:fs";
import { SourceMap } from "node:module";

const frame = process.argv[2]; // e.g. "app.js:1:24"
const [, line, column] = frame.split(":").map(Number);
const map = new SourceMap(JSON.parse(readFileSync("dist/app.js.map", "utf8")));
const e = map.findEntry(line - 1, column - 1); // findEntry uses 0-based offsets
console.log(`${frame}  →  ${e.originalSource}:${e.originalLine + 1}:${e.originalColumn + 1}${e.name ? ` (${e.name})` : ""}`);
```

```
$ node symbolicate.mjs app.js:1:24
app.js:1:24  →  ../src/cart.ts:4:16
$ node symbolicate.mjs app.js:1:99
app.js:1:99  →  ../src/main.ts:4:13 (totalPrice)
```

Compare with `node --enable-source-maps dist/app.js`, which does the same automatically:

```
TypeError: Cannot read properties of null (reading 'reduce')
    at totalPrice (src/cart.ts:4:16)
    at Object.<anonymous> (src/main.ts:4:13)
```

Notice that the name `totalPrice` appears on the **calling** frame (`main.ts:4:13`, where `e(...)`
is called). The top frame only has a position. That's why error trackers read function names from
the mapping at the call site. Try rebuilding after adding one line to `cart.ts` without updating the
map: the resulting positions are still "valid" but point to the wrong line.

**3. Web Vitals, a beacon, and `traceparent` on one page.** A product page with a late-inserted
banner, metrics sent via `sendBeacon` when the page is hidden, and a `fetch` carrying a
`traceparent` header.

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
            if (e.hadRecentInput) continue;      // shifts caused by user input don't count
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

        // A late-inserted banner pushes content down: a layout shift.
        setTimeout(() => {
          const banner = document.createElement("div");
          banner.style.height = "300px";
          banner.textContent = "Banner promo";
          document.body.prepend(banner);
        }, 300);

        // Send when the page is hidden: the only reliable moment on mobile.
        addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") {
            navigator.sendBeacon("/rum", JSON.stringify({ ...metrics, cls: +metrics.cls.toFixed(4), page: location.pathname }));
          }
        });
      </script>` });
  });
  await page.goto("https://shop.test/produk");
  await page.waitForTimeout(800);
  // Simulate the user switching tabs / closing the page.
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

Trace IDs and the LCP value differ on every run. What matters:

- **The `traceparent` header the API received is exactly the one sent in the RUM beacon.** In a real
  system, that ID connects a slow session on the RUM dashboard to its backend trace.
- **A 300 px banner only produces a CLS of 0.06.** A layout shift score is *impact fraction ×
  distance fraction*: only the heading and one paragraph moved, a small area of the 1280×720
  viewport. Add a `<div style="height:720px">` below the paragraph, and the same banner produces a
  CLS of 0.224, far above the 0.1 threshold.
- **The 32 ms LCP is lab data** from headless Chromium without throttling, not representative of
  users. That's why RUM exists.

Record your results and surprises in the [experiment notes](/en/notes/). Next challenge: replace
the hand-rolled `PerformanceObserver` with `onLCP`, `onINP`, and `onCLS` from the `web-vitals`
library, then compare the numbers after you scroll and click around the page.

## Practical implications

- **Add `crossorigin="anonymous"` and CORS headers for every script from a CDN.** Without them, your
  error tracker is blind to your own code.
- **Upload source maps to the error tracker per release, don't publish them unless you need to,**
  and tag every event with the same release version.
- **Capture more than `window.onerror`:** `unhandledrejection`, resource errors (capture phase),
  error boundaries, and failed HTTP responses.
- **Measure in the field with `web-vitals`**, report p75 per page and device, and use lab data to
  find causes, not to judge the user experience.
- **Send with `sendBeacon` on `visibilitychange` → `hidden`;** avoid `unload`.
- **Connect front-end to backend with `traceparent`,** and allow that header in CORS.
- **Limit volume and protect privacy:** sampling, batching, deduplication, and scrub personal data
  before sending.
- **Alert on regressions after a deploy**, not on absolute numbers, and rank bugs by the number of
  affected users.

## Primary sources

- [HTML spec: runtime script errors](https://html.spec.whatwg.org/multipage/webappapis.html#runtime-script-errors)
  (including *muted errors*) and [MDN: the `crossorigin` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)
- [ECMA-426: Source map format](https://tc39.es/ecma426/) and
  [Node.js: `module.SourceMap`](https://nodejs.org/api/module.html#class-modulesourcemap)
- [web.dev: Web Vitals](https://web.dev/articles/vitals), [CLS](https://web.dev/articles/cls), and
  [INP](https://web.dev/articles/inp)
- [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) and
  [OpenTelemetry: Browser](https://opentelemetry.io/docs/languages/js/getting-started/browser/)
- [MDN: `Navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) and
  [Chrome: Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- Charity Majors, Liz Fong-Jones, George Miranda, *Observability Engineering* (O'Reilly)
