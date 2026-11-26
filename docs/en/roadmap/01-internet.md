# 01 · Internet

> **Phase:** 1 · **Estimate:** 1 week · **Prerequisites:** none

## Why it matters

Every front-end decision about caching, bundle size, CDNs, preloading, and CORS is a decision about the
network. Developers who don't understand the path from URL to pixels end up optimizing in the wrong place.

## Concept map

### Basics
- [ ] How the internet works: packets, IP, routers, ISPs
- [ ] What HTTP is: methods, status codes, headers, body
- [ ] Domain names, registrars, and hosting
- [ ] DNS: resolver, root, TLD, authoritative, `A`/`AAAA`/`CNAME`/`TXT` records
- [ ] How browsers work at a high level

### Intermediate
- [ ] TCP handshake, TLS handshake, and their cost in round-trips
- [ ] HTTP/1.1 vs HTTP/2 (multiplexing) vs HTTP/3 (QUIC, UDP)
- [ ] HTTP caching: `Cache-Control`, `ETag`, `Last-Modified`, `Vary`, `stale-while-revalidate`
- [ ] CDNs and the edge: why physical distance still matters
- [ ] Compression: gzip vs brotli

### Deep dive
- [ ] Head-of-line blocking in TCP and how QUIC solves it
- [ ] Connection reuse, `preconnect`, `dns-prefetch`, 103 Early Hints
- [ ] How the browser decides resource priority (fetch priority)

## How to learn

1. Open DevTools → **Network**, check *Disable cache*, and load a site. Read the *Timing* tab of one
   request: DNS, Initial connection, SSL, TTFB, Content download. Write the numbers down.
2. Run `dig +trace example.com` and follow the DNS chain from root to authoritative.
3. Run `curl -v https://example.com` and read the TLS handshake and response headers.
4. Compare a site over HTTP/1.1 and HTTP/2 (the *Protocol* column in the Network panel) and look at
   the shape of the waterfall.
5. Caching experiment: build a small server that sends `Cache-Control: max-age=60`, then `no-cache` +
   `ETag`, and observe `200` vs `304` vs *from disk cache*.

## Check your understanding

1. What happens, step by step, between pressing Enter in the address bar and the first pixel appearing?
   Name at least 10 steps.
2. Why does domain sharding help on HTTP/1.1 but hurt on HTTP/2?
3. What's the difference between `no-cache` and `no-store`? When do you use each?
4. How many round-trips at minimum before the first byte of HTML arrives on a fresh HTTPS connection over
   HTTP/2? What about HTTP/3?
5. Why are responses with `Vary: Cookie` often not cached by CDNs?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | Deploy a static page to hosting + your own domain, configure DNS by hand | DNS, hosting |
| Intermediate | A small Node server with a different cache strategy per file type (HTML, hashed assets, API) | HTTP caching |
| Deep | Write a minimal HTTP/1.1 client on top of a TCP socket (`net` in Node) and parse the response yourself | The HTTP format up close |

## Primary sources

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) and [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [High Performance Browser Networking](https://hpbn.co/) (Ilya Grigorik, free online)
- [MDN: HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [web.dev: How browsers work](https://web.dev/articles/howbrowserswork)

## Related toolkit

- [`@chalidade/http-cache-presets`](/en/toolkit/http-cache-presets): `Cache-Control` builder and presets for hashed assets, HTML, APIs, and sensitive data
- Deep dive: [HTTP Caching](../deep-dives/http-caching.md)
