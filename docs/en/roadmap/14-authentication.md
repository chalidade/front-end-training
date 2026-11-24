# 14 · Authentication Strategies

> **Phase:** 5 · **Estimate:** 1–2 weeks · **Prerequisites:** [13 Web Security](13-web-security.md)

## Why it matters

Authentication is where security and UX collide most often. The front-end decides where tokens are
stored, how sessions are renewed, and what happens when a session expires.

## Concept map

### Basics
- [ ] Basic Auth, Session (cookie) Auth, Token Auth
- [ ] JWT: structure, signature, and what it does **not** guarantee
- [ ] OAuth 2.0 and OpenID Connect (OIDC)
- [ ] SSO

### Intermediate
- [ ] Authorization Code Flow + PKCE for SPAs
- [ ] Token storage: `HttpOnly` cookies vs memory vs `localStorage`, and the trade-offs
- [ ] Refresh token rotation, silent refresh
- [ ] The Backend-for-Frontend (BFF) pattern
- [ ] Route protection on the client vs the server

### Deep dive
- [ ] Passkeys / WebAuthn
- [ ] JWT revocation and why it's hard
- [ ] Multi-tab session sync (BroadcastChannel)

## How to learn

1. Implement login with a session cookie, then with JWTs, on a small backend of your own.
2. Walk through the OAuth flow by hand with the [OAuth 2.0 Playground](https://www.oauth.com/playground/).
3. Add passkeys to a demo app with the SimpleWebAuthn library.

## Check your understanding

1. Why is the Implicit Flow no longer recommended for SPAs?
2. If XSS happens, is a token in an `HttpOnly` cookie safe? What can an attacker still do?
3. What's the difference between OAuth (authorization) and OIDC (authentication)?
4. How do you handle many parallel requests that all get a 401 at once when a token expires?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | Login/logout with a session cookie + protected routes | Sessions |
| Intermediate | Login with Google/GitHub (OIDC + PKCE) through a BFF | OAuth |
| Deep | A `fetch` wrapper that refreshes the token once for many parallel requests (a request queue) | Concurrency, auth |

## Primary sources

- [OAuth 2.0 for Browser-Based Apps (IETF draft)](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [webauthn.guide](https://webauthn.guide/)

## Related toolkit

- [`@chalidade/fetch`](../toolkit/fetch.md): `fetchWithRetry` with timeouts and retries; token refresh is left as a practice project
