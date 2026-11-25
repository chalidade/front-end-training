# 13 · Web Security

> **Phase:** 5 · **Estimate:** 2 weeks · **Prerequisites:** [01 Internet](01-internet.md), [04 JavaScript](04-javascript.md)

## Why it matters

The front-end is where XSS happens, where tokens are stored, and where third-party scripts run with
full access to the page. Many data leaks start with a front-end decision that looked trivial.

## Concept map

### Basics
- [ ] HTTPS and why it's mandatory
- [ ] The same-origin policy
- [ ] CORS: simple requests vs preflight, the `Access-Control-*` headers
- [ ] The OWASP Top 10, especially the parts relevant to front-end

### Intermediate
- [ ] XSS: reflected, stored, DOM-based; why frameworks escape automatically and where that leaks (`dangerouslySetInnerHTML`, `href="javascript:"`)
- [ ] Content Security Policy: nonces, hashes, `strict-dynamic`
- [ ] CSRF and the `SameSite` cookie attribute
- [ ] Clickjacking and `frame-ancestors`
- [ ] Subresource Integrity (SRI)
- [ ] Security headers: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`

### Deep dive
- [ ] Trusted Types
- [ ] Cross-origin isolation: COOP, COEP, CORP (and their link to `SharedArrayBuffer`)
- [ ] Supply chain: third-party scripts, dependency compromise
- [ ] Prototype pollution

## How to learn

1. Do the XSS and CORS labs at [PortSwigger Web Security Academy](https://portswigger.net/web-security) (free).
2. Deploy a CSP in `Content-Security-Policy-Report-Only` mode on a real project and read the reports.
3. Set up two local origins and trigger every kind of CORS error on purpose.

## Check your understanding

1. Why does CORS protect the user, not the server? What doesn't CORS prevent?
2. When does the browser send an `OPTIONS` preflight?
3. Why does `SameSite=Lax` already prevent most CSRF, and when isn't it enough?
4. How is a nonce-based CSP + `strict-dynamic` safer than a domain allowlist?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | Audit your own site's security headers ([securityheaders.com](https://securityheaders.com/)) and fix them | Headers |
| Intermediate | Apply a strict CSP to a React/Next.js app | CSP |
| Deep | Build an intentionally vulnerable app, exploit it, then write the fixes + tests | XSS, CSRF |

## Primary sources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) and the [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Fetch Standard: CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [web.dev: Security](https://web.dev/explore/secure)

## Related toolkit

- [`@chalidade/security-headers`](/en/toolkit/security-headers): header presets (nonce-based strict CSP, HSTS, Permissions-Policy) for Next.js / Vite / Express
