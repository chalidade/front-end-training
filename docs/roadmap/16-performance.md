# 16 · Performance

> **Fase:** 6 · **Estimasi:** 3–4 minggu · **Prasyarat:** [03 CSS](03-css.md), [04 JavaScript](04-javascript.md), [09 Build Tools](09-build-tools.md)

## Kenapa ini penting

Performa langsung memengaruhi konversi, SEO (Core Web Vitals), dan pengalaman user di perangkat
murah. Ini juga area di mana pemahaman mendalam paling terlihat: optimasi tanpa pengukuran
hanyalah tebakan.

## Peta konsep

### Dasar
- [ ] Performance metrics: LCP, INP, CLS (Core Web Vitals), TTFB, FCP
- [ ] Lighthouse dan cara membaca laporannya
- [ ] DevTools: Network dan Performance panel
- [ ] Optimasi gambar, font, dan lazy loading

### Menengah
- [ ] Model RAIL dan pola PRPL
- [ ] Critical rendering path, render-blocking resources
- [ ] Lab data vs field data (CrUX, RUM dengan library `web-vitals`)
- [ ] Code splitting, preload, prefetch
- [ ] Long tasks dan cara memecahnya (`scheduler.yield`)
- [ ] Virtualisasi list

### Deep dive
- [ ] Rendering pipeline: style → layout → paint → composite; layer dan GPU
- [ ] Layout thrashing (forced synchronous layout)
- [ ] Cara INP diukur: input delay, processing time, presentation delay
- [ ] Memory profiling
- [ ] Performance budget di CI

## Cara belajar

1. Rekam satu interaksi lambat di Performance panel, lalu identifikasi long task dan penyebabnya.
2. Pasang library `web-vitals` di project nyata dan kirim datanya ke endpoint sendiri selama satu minggu.
3. Buat layout thrashing dengan sengaja (baca `offsetHeight` lalu tulis `style` di loop), ukur, lalu perbaiki.
4. Throttle CPU 6x + Slow 4G di DevTools dan gunakan aplikasimu selama 10 menit.

## Uji pemahaman

1. Kenapa skor Lighthouse 100 tidak menjamin Core Web Vitals lolos di lapangan?
2. Apa saja komponen LCP (TTFB, resource load delay, load time, render delay) dan cara mengoptimasi masing-masing?
3. Kenapa animasi `transform` lebih murah dari `left`?
4. Bagaimana `font-display` dan `size-adjust` memengaruhi CLS?
5. Kenapa `React.memo` di semua komponen bisa memperlambat aplikasi?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Bawa satu halaman ke "Good" untuk semua Core Web Vitals | Metrik |
| Menengah | Dashboard RUM sederhana dari data `web-vitals` | Field data |
| Deep | Komponen virtualized list dari nol (tinggi dinamis) | Rendering, scroll |

## Sumber primer

- [web.dev: Web Vitals](https://web.dev/articles/vitals) dan [Optimize LCP/INP/CLS](https://web.dev/explore/learn-core-web-vitals)
- [Chrome DevTools: Performance](https://developer.chrome.com/docs/devtools/performance)
- [HTML spec: update the rendering](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering)

## Toolkit terkait

- [`@chalidade/utils`](../toolkit/utils.md): `debounce`, `throttle`
- [`@chalidade/react-hooks`](../toolkit/react-hooks.md): `useIntersectionObserver`, `useThrottledCallback`
- [`useVirtualList`](../toolkit/react-hooks.md#usevirtuallist) di `@chalidade/react-hooks`
- Deep dive: [Efisiensi di React](../deep-dives/react-efficiency.md)
- Deep dive: [Cara kerja V8](../deep-dives/v8.md)
- Deep dive: [Browser Rendering Pipeline](../deep-dives/browser-rendering-pipeline.md)
- Deep dive: [HTTP Caching](../deep-dives/http-caching.md)
