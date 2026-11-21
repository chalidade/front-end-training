# 18 · Rendering Strategies (SSR, SSG, dan Meta-framework)

> **Fase:** 7 · **Estimasi:** 2–3 minggu · **Prasyarat:** [07 Framework](07-framework.md), [16 Performance](16-performance.md)

## Kenapa ini penting

Di mana dan kapan HTML dibuat menentukan performa, SEO, biaya server, dan kompleksitas. Ini
keputusan arsitektur, bukan sekadar pilihan framework.

## Peta konsep

### Dasar
- [ ] CSR vs SSR vs SSG
- [ ] Meta-framework: Next.js (React), Nuxt (Vue), SvelteKit, Angular SSR, Astro
- [ ] Static Site Generators: Astro, Eleventy, VitePress
- [ ] Hydration

### Menengah
- [ ] ISR dan revalidation
- [ ] Streaming SSR dan Suspense
- [ ] Islands architecture (Astro)
- [ ] Edge rendering
- [ ] Data fetching per route, caching di framework

### Deep dive
- [ ] Biaya hydration dan alternatifnya: partial hydration, resumability (Qwik)
- [ ] React Server Components, Server Actions
- [ ] Hydration mismatch: penyebab dan cara men-debug-nya
- [ ] Cache layers di Next.js App Router

## Cara belajar

1. Bangun halaman produk yang sama sebagai CSR, SSR, dan SSG, lalu ukur TTFB, LCP, dan INP masing-masing.
2. Buat hydration mismatch dengan sengaja (misal `Date.now()` di render) dan baca pesan error-nya.
3. Bangun situs dokumentasi dengan Astro, tambahkan satu island interaktif.

## Uji pemahaman

1. Kenapa SSR bisa mempercepat LCP tapi memperlambat INP?
2. Apa yang sebenarnya dilakukan hydration? Kenapa disebut "melakukan pekerjaan dua kali"?
3. Bagaimana resumability (Qwik) berbeda dari hydration?
4. Kapan SSG lebih tepat daripada SSR, dan kapan tidak bisa?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Blog dengan SSG (Astro / Next.js) | SSG |
| Menengah | E-commerce kecil dengan Next.js App Router: SSR, ISR, streaming | Strategi campuran |
| Deep | **Mini SSR framework:** render React ke string di server, kirim, lalu hydrate di client | Hydration |

## Sumber primer

- [web.dev: Rendering on the Web](https://web.dev/articles/rendering-on-the-web)
- [Next.js docs](https://nextjs.org/docs), [Astro docs](https://docs.astro.build/)
- [Patterns.dev: Rendering patterns](https://www.patterns.dev/)

## Toolkit terkait

- Deep dive: [Micro-frontend: kapan dan kapan tidak](../deep-dives/micro-frontend.md)
- Situs dokumentasi ini sendiri dibangun dengan SSG (VitePress)
