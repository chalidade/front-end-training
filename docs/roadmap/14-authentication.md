# 14 · Authentication Strategies

> **Fase:** 5 · **Estimasi:** 1–2 minggu · **Prasyarat:** [13 Web Security](13-web-security.md)

## Kenapa ini penting

Autentikasi adalah tempat keamanan dan UX paling sering bertabrakan. Front-end menentukan di mana
token disimpan, bagaimana sesi diperbarui, dan apa yang terjadi saat sesi habis.

## Peta konsep

### Dasar
- [ ] Basic Auth, Session (cookie) Auth, Token Auth
- [ ] JWT: struktur, signature, dan apa yang **tidak** dijamin
- [ ] OAuth 2.0 dan OpenID Connect (OIDC)
- [ ] SSO

### Menengah
- [ ] Authorization Code Flow + PKCE untuk SPA
- [ ] Penyimpanan token: cookie `HttpOnly` vs memory vs `localStorage`, dan trade-off-nya
- [ ] Refresh token rotation, silent refresh
- [ ] Pola Backend-for-Frontend (BFF)
- [ ] Proteksi route di client vs server

### Deep dive
- [ ] Passkeys / WebAuthn
- [ ] Revokasi JWT dan kenapa sulit
- [ ] Multi-tab session sync (BroadcastChannel)

## Cara belajar

1. Implementasikan login dengan session cookie, lalu dengan JWT, di backend kecil milik sendiri.
2. Ikuti OAuth flow secara manual dengan [OAuth 2.0 Playground](https://www.oauth.com/playground/).
3. Tambahkan passkey ke aplikasi demo dengan library SimpleWebAuthn.

## Uji pemahaman

1. Kenapa Implicit Flow tidak lagi disarankan untuk SPA?
2. Kalau XSS terjadi, apakah token di cookie `HttpOnly` aman? Apa yang tetap bisa dilakukan penyerang?
3. Apa beda OAuth (authorization) dan OIDC (authentication)?
4. Bagaimana menangani banyak request paralel yang mendapat 401 bersamaan saat token kedaluwarsa?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Login/logout dengan session cookie + protected route | Session |
| Menengah | Login dengan Google/GitHub (OIDC + PKCE) lewat BFF | OAuth |
| Deep | Wrapper `fetch` yang melakukan refresh token sekali untuk banyak request paralel (request queue) | Konkurensi, auth |

## Sumber primer

- [OAuth 2.0 for Browser-Based Apps (IETF draft)](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [webauthn.guide](https://webauthn.guide/)

## Toolkit terkait

- [`@chalidade/fetch`](../toolkit/fetch.md): `fetchWithRetry` dengan timeout dan retry; refresh token sengaja dijadikan proyek latihan
