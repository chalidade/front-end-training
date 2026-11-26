# @chalidade/http-cache-presets

A builder and presets for the `Cache-Control` header. It turns the patterns from the
[HTTP Caching deep dive](/en/deep-dives/http-caching) into code: hashed assets cached forever,
HTML always revalidated, per-user data kept off the CDN, and sensitive data never stored. No
dependencies.

```bash
pnpm add @chalidade/http-cache-presets
# or
npm install @chalidade/http-cache-presets
```

::: warning Not yet published
This package isn't on npm yet. For now, copy the source from
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/http-cache-presets/src).
:::

## Why a package?

`Cache-Control` is one line of text, but its mistakes are expensive and silent:

- **A long `max-age` on a URL whose content can change** can't be taken back. Users' browsers keep
  the old version until it expires, whatever you deploy.
- **Contradictory combinations** such as `public, private` or `no-store, max-age=3600` produce no
  error. The cache picks one interpretation, and browsers and CDNs may pick differently.
- **Forgetting the header** doesn't mean "don't cache". Without `Cache-Control`, the browser may
  use *heuristic freshness* based on `Last-Modified` (the experiment below shows the effect).

`cacheControl` throws for combinations like these, and the presets give the right value for the
most common cases.

## Experiment: what actually gets requested again

A small Node server sends different headers for each file, all with an `ETag`. The page was
opened in Chromium (Playwright) four times: first visit, navigate again, navigate again after 1.5
seconds, then the reload button. The last column is the status the server returned on each visit.

```text
file               Cache-Control                                  seen by the server
/                  no-cache                                       200 304 304 304
/app.3f9a1c7e.js   public, max-age=31536000, immutable            200
/logo.js           (no header, Last-Modified 30 days ago)         200
/api.js            public, max-age=1, stale-while-revalidate=30   200 304
/me.js             no-store                                       200 200 200 200
```

What the table shows:

- **HTML with `no-cache`** always asks the server, but the answer is a bodiless `304`. A new
  deploy shows up immediately and costs little.
- **The `immutable` asset** is requested once, including on reload.
- **`/logo.js` with no header is also requested only once.** The browser treats it as fresh based
  on its age (the common heuristic is 10% of the time since `Last-Modified`, about 3 days here). If
  this file is replaced without renaming it, users can see the old version for days. That's why
  `presetFor` gives `no-cache` to everything that isn't hashed.
- **`stale-while-revalidate`**: the third visit came after `max-age=1` had run out. The browser
  used the copy it had and revalidated in the background (that's the `304`), so the page didn't
  wait for the network.
- **`no-store`** is requested every time, without exception.

## API

### `cacheControl(options)`

```ts
import { cacheControl } from "@chalidade/http-cache-presets";

cacheControl({ public: true, maxAge: "1m", sMaxAge: "1h", staleWhileRevalidate: "5m" });
// "public, max-age=60, s-maxage=3600, stale-while-revalidate=300"
```

| Option | Directive |
| --- | --- |
| `public` / `private` | `public` / `private` |
| `noCache` / `noStore` | `no-cache` / `no-store` |
| `maxAge` / `sMaxAge` | `max-age=N` / `s-maxage=N` (CDN only) |
| `staleWhileRevalidate` / `staleIfError` | `stale-while-revalidate=N` / `stale-if-error=N` |
| `mustRevalidate` / `immutable` / `noTransform` | `must-revalidate` / `immutable` / `no-transform` |

Durations can be a number of seconds or a string: `"30s"`, `"10m"`, `"1h"`, `"7d"`, `"1w"`, `"1y"`.

Throws for: `public` + `private`, `noStore` with any other directive, `immutable` without `maxAge`
(immutable only applies while the response is fresh), `immutable` + `noCache`, `private` +
`sMaxAge` (CDNs don't store it), empty options, and negative or fractional-second durations.

### `cachePresets` and `publicApi(maxAge?, staleWhileRevalidate?)`

| Preset | Value | For |
| --- | --- | --- |
| `cachePresets.immutable` | `public, max-age=31536000, immutable` | assets with a hash in the file name |
| `cachePresets.revalidate` | `no-cache` | HTML, entry points, unhashed assets |
| `cachePresets.private` | `private, no-cache` | per-user responses |
| `cachePresets.sensitive` | `no-store` | tokens, banking data, account pages |
| `publicApi()` | `public, max-age=60, stale-while-revalidate=300` | public data that may be slightly stale |

`revalidate` and `private` are only cheap if the server sends an `ETag` or `Last-Modified`, so that
revalidation can be answered with `304`. Most static servers and frameworks already do.

### `presetFor(path, options?)`

Picks a preset from a path: `immutable` for hashed file names, `revalidate` for everything else.
There is no third option, on purpose. When in doubt, the answer is revalidate.

```ts
presetFor("/static/app.3f9a1c7e.js"); // "public, max-age=31536000, immutable"
presetFor("/index.html");             // "no-cache"
presetFor("/my-component.js");        // "no-cache", a long ordinary name is not a hash
```

The default pattern recognizes hexadecimal hashes of at least 8 characters (`app.3f9a1c7e.js`,
`main-a1b2c3d4.css`). Vite's hashes use base64url (`index-BvH2kQ_x.js`), which can't be told apart
from ordinary words, so for Vite match the folder instead:

```ts
presetFor(req.path, { hashed: /^\/assets\// });
```

## Wiring it into a server

**Express** with `express.static`:

```ts
import { cachePresets, presetFor } from "@chalidade/http-cache-presets";

app.use(
  express.static("dist", {
    setHeaders: (res, filePath) => res.setHeader("Cache-Control", presetFor(filePath.replace(/\\/g, "/"))),
  }),
);
app.get("/api/me", (_req, res) => res.set("Cache-Control", cachePresets.private).json(user));
```

**Next.js** already handles caching for `/_next/static` itself. Use this package for route
handlers and files in `public/`:

```ts
// app/api/products/route.ts
import { publicApi } from "@chalidade/http-cache-presets";

export async function GET() {
  return Response.json(await getProducts(), { headers: { "Cache-Control": publicApi("1m", "10m") } });
}
```

**CDNs and static hosts** (Netlify, Cloudflare Pages, Vercel) usually use a header config file. You
can copy the values from `cachePresets` straight into it.

## Deliberately left out

- **The `Vary`, `ETag`, and `Expires` headers.** `ETag` is created by the server from the file's
  content, and `max-age` wins over `Expires`. `Vary` is covered in the
  [HTTP Caching deep dive](/en/deep-dives/http-caching).
- **Per-CDN configuration.** Each CDN has its own extra directives (such as `CDN-Cache-Control`).
  This package only writes what's in RFC 9111 and RFC 5861.

## Related concepts

[01 Internet & HTTP](/en/roadmap/01-internet), the [HTTP Caching deep dive](/en/deep-dives/http-caching),
and [`@chalidade/security-headers`](/en/toolkit/security-headers) for security headers on the same
response.

## Learn from the source

Suggested exercise: read
[`cacheControl.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/http-cache-presets/src/cacheControl.ts),
then answer these before looking at the tests. Why does `presetFor` have no "cache briefly" option
for unhashed files? Why is `immutable` without `maxAge` rejected instead of given a default? If
`/logo.js` in the experiment above were replaced today, when would a user first see the new
version?
