# 13 · Web Security

> **Fase:** 5 · **Estimasi:** 2 minggu · **Prasyarat:** [01 Internet](01-internet.md), [04 JavaScript](04-javascript.md)

## Kenapa ini penting

Front-end adalah tempat XSS terjadi, token disimpan, dan third-party script berjalan dengan akses
penuh ke halaman. Banyak kebocoran data bermula dari keputusan front-end yang terlihat sepele.

## Peta konsep

### Dasar
- [ ] HTTPS dan kenapa wajib
- [ ] Same-origin policy
- [ ] CORS: simple request vs preflight, header `Access-Control-*`
- [ ] OWASP Top 10, terutama yang relevan untuk front-end

### Menengah
- [ ] XSS: reflected, stored, DOM-based; kenapa framework escape otomatis dan di mana bocornya (`dangerouslySetInnerHTML`, `href="javascript:"`)
- [ ] Content Security Policy: nonce, hash, `strict-dynamic`
- [ ] CSRF dan cookie `SameSite`
- [ ] Clickjacking dan `frame-ancestors`
- [ ] Subresource Integrity (SRI)
- [ ] Header keamanan: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`

### Deep dive
- [ ] Trusted Types
- [ ] Cross-origin isolation: COOP, COEP, CORP (dan kaitannya dengan `SharedArrayBuffer`)
- [ ] Supply chain: third-party script, dependency compromise
- [ ] Prototype pollution

## Cara belajar

1. Kerjakan lab XSS dan CORS di [PortSwigger Web Security Academy](https://portswigger.net/web-security) (gratis).
2. Pasang CSP dalam mode `Content-Security-Policy-Report-Only` di project nyata, lalu baca laporannya.
3. Buat dua origin lokal dan picu semua jenis error CORS dengan sengaja.

## Uji pemahaman

1. Kenapa CORS melindungi user, bukan server? Apa yang tidak dicegah oleh CORS?
2. Kapan browser mengirim preflight `OPTIONS`?
3. Kenapa `SameSite=Lax` sudah mencegah sebagian besar CSRF, dan kapan tidak cukup?
4. Bagaimana CSP berbasis nonce + `strict-dynamic` lebih aman dari allowlist domain?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Audit header keamanan situs sendiri ([securityheaders.com](https://securityheaders.com/)) dan perbaiki | Header |
| Menengah | Terapkan CSP strict di aplikasi React/Next.js | CSP |
| Deep | Buat aplikasi sengaja-rentan, eksploitasi, lalu tulis perbaikan + test-nya | XSS, CSRF |

## Sumber primer

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) dan [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Fetch Standard: CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [web.dev: Security](https://web.dev/explore/secure)

## Toolkit terkait

- [`@chalidade/security-headers`](/toolkit/security-headers): preset header (CSP strict ber-nonce, HSTS, Permissions-Policy) untuk Next.js / Vite / Express
