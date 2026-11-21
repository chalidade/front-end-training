# 18 · Rendering Strategies (SSR, SSG, and Meta-frameworks)

> **Phase:** 7 · **Estimate:** 2–3 weeks · **Prerequisites:** [07 Framework](07-framework.md), [16 Performance](16-performance.md)

## Why it matters

Where and when HTML is generated determines performance, SEO, server cost, and complexity. It's an
architecture decision, not just a framework choice.

## Concept map

### Basics
- [ ] CSR vs SSR vs SSG
- [ ] Meta-frameworks: Next.js (React), Nuxt (Vue), SvelteKit, Angular SSR, Astro
- [ ] Static Site Generators: Astro, Eleventy, VitePress
- [ ] Hydration

### Intermediate
- [ ] ISR and revalidation
- [ ] Streaming SSR and Suspense
- [ ] Islands architecture (Astro)
- [ ] Edge rendering
- [ ] Per-route data fetching, framework caching

### Deep dive
- [ ] The cost of hydration and its alternatives: partial hydration, resumability (Qwik)
- [ ] React Server Components, Server Actions
- [ ] Hydration mismatches: causes and how to debug them
- [ ] The cache layers in the Next.js App Router

## How to learn

1. Build the same product page as CSR, SSR, and SSG, then measure TTFB, LCP, and INP for each.
2. Cause a hydration mismatch on purpose (e.g. `Date.now()` in render) and read the error message.
3. Build a documentation site with Astro and add one interactive island.

## Check your understanding

1. Why can SSR speed up LCP but slow down INP?
2. What does hydration actually do? Why is it described as "doing the work twice"?
3. How is resumability (Qwik) different from hydration?
4. When is SSG a better fit than SSR, and when is it impossible?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | A blog with SSG (Astro / Next.js) | SSG |
| Intermediate | A small e-commerce site with the Next.js App Router: SSR, ISR, streaming | Mixed strategies |
| Deep | **Mini SSR framework:** render React to a string on the server, send it, then hydrate on the client | Hydration |

## Primary sources

- [web.dev: Rendering on the Web](https://web.dev/articles/rendering-on-the-web)
- [Next.js docs](https://nextjs.org/docs), [Astro docs](https://docs.astro.build/)
- [Patterns.dev: Rendering patterns](https://www.patterns.dev/)

## Related toolkit

- Deep dive: [Micro-frontends: when and when not](../deep-dives/micro-frontend.md)
- This documentation site itself is built with SSG (VitePress)
