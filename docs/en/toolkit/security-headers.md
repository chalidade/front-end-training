# @chalidade/security-headers

HTTP security header presets (CSP, HSTS, and friends) with safe defaults, plus a CSP builder that
rejects mistakes that silently weaken the policy. No dependencies, and the result is a plain
`{ name: value }` object you can wire into Next.js, Vite, or Express.

```bash
pnpm add @chalidade/security-headers
# or
npm install @chalidade/security-headers
```

::: warning Not yet published
This package isn't on npm yet. For now, copy the source from
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/security-headers/src).
:::

## Why a package?

Security headers are just strings, but strings that are easy to get wrong without any error:

- **`default-src self`** (unquoted) does not mean "my own origin". The browser reads it as *a host
  named `self`*, so scripts from your own origin get blocked too.
- **Values from variables** (a nonce or a CDN domain from env) that contain `;` can inject a new
  directive into the CSP.
- **HSTS `preload`** has requirements (`max-age` of at least a year and `includeSubDomains`).
  Setting it on a domain whose subdomains aren't on HTTPS yet can make those subdomains
  unreachable for months.

`buildCsp` and `securityHeaders` throw for all of the above, at build time or server start, not
after users are affected.

## Experiment: what actually gets blocked

The same page loaded in Chromium (Playwright) with different headers. The page has one nonce'd
script that loads `/a.js`, one inline script without a nonce (think of it as an XSS injection),
and one `<img onerror>`.

```text
CSP                                         what ran                             console errors
no CSP                                      nonce, injected, onerror, file       0
strictCsp(nonce)                            nonce, file                          2
default-src 'self'; script-src 'self' …     file                                 0
default-src self;   script-src self …       (nothing)                            1
```

The second row shows how `'strict-dynamic'` works: `/a.js` still runs because a trusted script
loaded it, while the injected script and the `onerror` handler are blocked. The last row is the
quoting trap: one missing character blocks your own scripts. `buildCsp` rejects that input with
the message `keyword harus dikutip, tulis "'self'" bukan "self"` ("keyword must be quoted").

## API

### `securityHeaders(options?)`

```ts
import { securityHeaders } from "@chalidade/security-headers";

securityHeaders();
// {
//   "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
//   "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
//   "X-Content-Type-Options": "nosniff",
//   "Referrer-Policy": "strict-origin-when-cross-origin",
//   "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
//   "X-Frame-Options": "DENY",
//   "Cross-Origin-Opener-Policy": "same-origin",
// }
```

| Option | Default | Meaning |
| --- | --- | --- |
| `csp` | `DEFAULT_CSP` | directive object; `false` to send no CSP |
| `cspReportOnly` | `false` | send as `Content-Security-Policy-Report-Only` (reports, doesn't block) |
| `hsts` | `{ maxAge: 63072000, includeSubDomains: true, preload: false }` | `false` for development on `http://localhost` |
| `referrerPolicy` | `"strict-origin-when-cross-origin"` | `Referrer-Policy` value |
| `permissionsPolicy` | camera, microphone, and geolocation off | feature object, see `buildPermissionsPolicy` |
| `frameOptions` | `"DENY"` | `X-Frame-Options` for browsers that don't understand `frame-ancestors` |
| `coop` | `"same-origin"` | `Cross-Origin-Opener-Policy` |

Every option accepts `false` to drop its header. `X-Content-Type-Options: nosniff` is always sent
because there's no reason to turn it off.

### `buildCsp(directives)`

```ts
buildCsp({
  "default-src": ["'self'"],
  "img-src": ["'self'", "data:", "https://cdn.example.com"],
  "upgrade-insecure-requests": true, // directive without a value
  "script-src": isDev && false,      // false/undefined are skipped
});
// "default-src 'self'; img-src 'self' data: https://cdn.example.com; upgrade-insecure-requests"
```

Throws for: unquoted keywords (`self`, `none`, `unsafe-inline`, `nonce-…`, `sha256-…`, and
others), sources containing spaces, `;` or `,`, empty source lists (use `["'none'"]`), and
directive names that aren't lowercase (such as `scriptSrc`).

### `strictCsp(nonce, extra?)` and `createNonce()`

A nonce-based *strict* CSP, following [web.dev/strict-csp](https://web.dev/articles/strict-csp):

```ts
const nonce = createNonce(); // 16 random bytes, base64. Create a new one for EVERY response.
buildCsp(strictCsp(nonce, { "report-uri": ["/csp-report"] }));
// "script-src 'nonce-…' 'strict-dynamic' https: 'unsafe-inline'; object-src 'none';
//  base-uri 'none'; frame-ancestors 'none'; report-uri /csp-report"
```

`https:` and `'unsafe-inline'` are only fallbacks for old browsers. Browsers that understand
nonces ignore `'unsafe-inline'`, and those that understand `'strict-dynamic'` ignore `https:`.
A nonce reused across responses protects nothing, because an attacker can read it from the page
and use it.

### `buildPermissionsPolicy(policy)` and `toHeaderList(headers)`

```ts
buildPermissionsPolicy({ camera: [], geolocation: ["self", "https://maps.example.com"] });
// 'camera=(), geolocation=(self "https://maps.example.com")'

toHeaderList({ "X-Content-Type-Options": "nosniff" });
// [{ key: "X-Content-Type-Options", value: "nosniff" }]  ← the shape next.config wants
```

## Wiring it into a framework

**Next.js** (static headers, no nonce):

```js
// next.config.mjs
import { securityHeaders, toHeaderList } from "@chalidade/security-headers";

export default {
  async headers() {
    return [{ source: "/(.*)", headers: toHeaderList(securityHeaders()) }];
  },
};
```

For a nonce-based CSP in Next.js, the nonce must be created per request in middleware. Follow the
[Content Security Policy guide in the Next.js docs](https://nextjs.org/docs/app/guides/content-security-policy)
and fill the header with `buildCsp(strictCsp(createNonce()))`.

**Vite** (dev server and `vite preview`):

```ts
// vite.config.ts
import { securityHeaders } from "@chalidade/security-headers";

const headers = securityHeaders({ hsts: false, cspReportOnly: true });
export default { server: { headers }, preview: { headers } };
```

Vite's dev server injects inline scripts and a WebSocket for HMR, so a blocking CSP usually breaks
development. Use `cspReportOnly` in dev to see violations without blocking, then set the real
headers on your production server or CDN.

**Express:**

```ts
import { securityHeaders } from "@chalidade/security-headers";

const headers = securityHeaders();
app.use((_req, res, next) => {
  res.set(headers);
  next();
});
```

## Deliberately left out

- **Per-framework middleware.** The result is a plain object, and wiring it takes a few lines. One
  small package is easier to read than three adapters.
- **Obsolete headers.** `X-XSS-Protection` has been removed from modern browsers and can make
  things worse. `Expect-CT` is no longer used either.
- **CORS.** CORS controls who may *read* a response; it doesn't protect your page. See
  [13 Web Security](/en/roadmap/13-web-security).

## Related concepts

[13 Web Security](/en/roadmap/13-web-security) (XSS, CSP, clickjacking),
[14 Authentication](/en/roadmap/14-authentication) (cookies and HTTPS), and the
[Front-end observability deep dive](/en/deep-dives/observability) (collecting CSP violation reports).

## Learn from the source

Suggested exercise: read
[`securityHeaders.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/security-headers/src/securityHeaders.ts),
then answer these before looking at the tests. Why does `strictCsp` validate the nonce when the
server creates it itself? Why can't `frame-ancestors` be set through `<meta http-equiv>`? What
happens to users if you ship HSTS with a 2-year `max-age` and your HTTPS certificate then expires?
