# Deep Dive: HTTP Caching

> Related: [01 Internet](../roadmap/01-internet.md), [09 Build Tools](../roadmap/09-build-tools.md),
> [16 Performance](../roadmap/16-performance.md), [17 Browser APIs & PWA](../roadmap/17-browser-apis.md)

## Opening questions

Why do users still see the old version after a deploy? Why does `no-cache` still cache? Why can a
JS file with a hash in its name be cached for a year, but `index.html` can't? What's actually
different between "(disk cache)" and "304" in the Network panel?

## Mental model

Every cached response faces two questions:

1. **Is it still fresh?** If so, the browser uses it **without touching the network at all**.
2. **If it's stale, is it still the same?** The browser asks the server with a *conditional
   request*. If nothing changed, the server replies `304 Not Modified` with no body, and the
   cached copy is reused.

```
request → in cache?
  ├─ no  → fetch from network → store if allowed
  └─ yes → fresh? (age < freshness lifetime)
        ├─ yes → use cache                (0 round trips)
        └─ no  → revalidate (If-None-Match / If-Modified-Since)
              ├─ 304 → use cache, refresh metadata   (1 round trip, no body)
              └─ 200 → use the new response, replace the cache
```

**Freshness** saves round trips. **Validation** saves bandwidth. A good caching strategy picks the
right one for each kind of resource.

## Detailed mechanism

### Freshness

- `Cache-Control: max-age=N`: fresh for N seconds from when the response was generated. The `Age`
  from proxies/CDNs counts toward it.
- `s-maxage=N`: the same, but only for shared caches (CDNs, proxies), where it overrides `max-age`.
- `Expires: <date>`: the old way. Ignored when `max-age` is present.
- **Heuristic freshness**: with no `max-age` or `Expires` but a `Last-Modified`, caches may guess,
  typically 10% of the file's age. A file last changed 30 days ago may be treated as fresh for
  about 3 days without ever asking the server. That's the classic "why is it still the old
  version?".

### Validation

| Validator from the server | Sent back by the browser |
| --- | --- |
| `ETag: "abc123"` | `If-None-Match: "abc123"` |
| `Last-Modified: <date>` | `If-Modified-Since: <date>` |

ETags are more precise (no clock or 1-second resolution issues). When both are present, the server
uses `If-None-Match`.

### Commonly misunderstood directives

| Directive | What it actually means |
| --- | --- |
| `no-cache` | May be stored, but **must be revalidated** before every use |
| `no-store` | Don't store it at all (sensitive data) |
| `private` | Browser cache only, not CDNs/proxies (per-user responses) |
| `public` | Shared caches may store it, even responses they normally wouldn't (e.g. with `Authorization`) |
| `must-revalidate` | Once stale, never use it without revalidating, even if the server is unreachable |
| `immutable` | While fresh, don't revalidate even when the user reloads |
| `stale-while-revalidate=N` | Once stale, may be used for N seconds while revalidating in the background |
| `stale-if-error=N` | May serve the stale copy if the server errors |

### `Vary`

`Vary: Accept-Encoding` means the response is cached **per value of that header**: gzip and brotli
versions are stored separately. `Vary: Cookie` or `Vary: User-Agent` on a CDN is almost the same as
turning caching off, since nearly every user sends a different value.

### Cache layers

Lookup order, roughly: **memory cache** (within the tab, for recently used resources) →
**Service Worker** (if any, and it decides whatever it wants) → **HTTP cache** (disk) → **CDN /
proxy** → origin. The **bfcache** (back/forward cache) is separate: it keeps the whole live page
when the user presses back, not HTTP responses.

### Reload behavior

- Normal navigation: freshness rules apply as usual.
- Reload: the main document is always revalidated. Chrome only revalidates the main document,
  while Firefox also revalidates subresources unless they're marked `immutable`.
- Hard reload (Ctrl/Cmd+Shift+R): bypasses the cache.

## Experiments

1. **Look at the real headers.**
   ```bash
   curl -sI https://chalidade.github.io/front-end-training/ | grep -iE "cache-control|etag|last-modified|age|expires"
   ```
   Then fetch a file under `/front-end-training/assets/` and compare. Why are the values the same even though one
   has a hash in its name? (GitHub Pages can't be configured per file.)
2. **A 304 by hand.** Take the ETag from step 1, then:
   ```bash
   curl -sI -H 'If-None-Match: "<etag>"' https://chalidade.github.io/front-end-training/
   ```
3. **Your own server.** Write a tiny Node server that returns a different `Cache-Control` per path
   (`max-age=10`, `no-cache`, `no-store`, `max-age=31536000, immutable`). Open it in DevTools with
   *Disable cache* off, and note the Size column: `(memory cache)`, `(disk cache)`, `304`, or the
   full size. Try a normal navigation, a reload, and a hard reload.
4. **Heuristic freshness.** Remove `Cache-Control`, send a `Last-Modified` from 30 days ago, change
   the file, then do a normal reload. Does the browser ask the server?

## Practical implications

The pattern almost every modern app uses:

| Resource | Header | Why |
| --- | --- | --- |
| Hashed assets (`app.3f9a1c.js`, fonts, bundler images) | `public, max-age=31536000, immutable` | New content = new name, so caching forever is safe |
| HTML / entry point | `no-cache` (plus an ETag) | Always revalidate so a new deploy shows up immediately, still cheap via 304 |
| Public API data | Short `max-age` + `stale-while-revalidate` | Fast and fresh enough |
| Per-user responses | `private, no-cache` | Must never be stored on a CDN and leak to other users |
| Sensitive data (tokens, banking) | `no-store` | Never written to disk |

This table is available as code in [`@chalidade/http-cache-presets`](/en/toolkit/http-cache-presets),
with a Chromium experiment showing which files actually get requested again.

- **Never** give a long `max-age` to a URL whose content can change. There's no way to "recall" a
  response already cached in users' browsers.
- If users see an old version after a deploy, check the HTML headers first: there's almost always a
  `max-age` or heuristic freshness at play.
- A Service Worker adds a cache layer you control, and also a new way to serve stale versions. Make
  sure you have a clear update strategy.

## Primary sources

- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [RFC 9110: HTTP Semantics, Conditional Requests](https://www.rfc-editor.org/rfc/rfc9110#name-conditional-requests)
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- Jake Archibald, [*Caching best practices & max-age gotchas*](https://jakearchibald.com/2016/caching-best-practices/)
- [web.dev: Prevent unnecessary network requests with the HTTP Cache](https://web.dev/articles/http-cache)
