# Toolkit

The toolkits are small npm packages that grow out of the roadmap material. Each package has two goals:

1. **To be used** in real projects: small, dependency-free, and fully typed.
2. **To be studied**: the source is deliberately short and readable, and every function links to
   the roadmap stage that explains the concept behind it.

## Packages

| Package | Contents | Status |
| --- | --- | --- |
| [`@chalidade/utils`](/en/toolkit/utils) | `debounce`, `throttle`, `cx`, `clamp` | ✅ ready, not yet published to npm |
| [`@chalidade/tokens`](/en/toolkit/tokens) | Design tokens (color, spacing, typography) as CSS variables + TS | ✅ ready, not yet published to npm |
| [`@chalidade/react-hooks`](/en/toolkit/react-hooks) | `useDebouncedValue`, `useMediaQuery`, `useLocalStorage`, `useIntersectionObserver`, … | ✅ ready, not yet published to npm |
| [`@chalidade/fetch`](/en/toolkit/fetch) | `fetchWithRetry`: timeout, retries with backoff + jitter, `Retry-After` | ✅ ready, not yet published to npm |
| [`@chalidade/security-headers`](/en/toolkit/security-headers) | Security header presets (strict CSP, HSTS, Permissions-Policy) for Next.js / Vite / Express | ✅ ready, not yet published to npm |
| [`@chalidade/http-cache-presets`](/en/toolkit/http-cache-presets) | `Cache-Control` builder and presets (hashed assets, HTML, APIs, sensitive data) | ✅ ready, not yet published to npm |
| `@chalidade/ui` | Accessible components (Button, Dialog, Tabs, Combobox, …) | 🗓️ planned |

## Principles

- **No runtime dependencies** wherever possible.
- **Tree-shakeable**: ESM + `sideEffects: false`.
- **Tested**: every function has tests (Vitest).
- **Accessible**: UI components follow the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/).

## Developing locally

```bash
git clone https://github.com/chalidade/front-end-training
cd fet
pnpm install
pnpm test        # run all tests
pnpm build       # build ESM + CJS + .d.ts
pnpm docs:dev    # run this documentation site locally
```
