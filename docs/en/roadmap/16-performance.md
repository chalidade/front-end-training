# 16 · Performance

> **Phase:** 6 · **Estimate:** 3–4 weeks · **Prerequisites:** [03 CSS](03-css.md), [04 JavaScript](04-javascript.md), [09 Build Tools](09-build-tools.md)

## Why it matters

Performance directly affects conversion, SEO (Core Web Vitals), and the experience of users on cheap
devices. It's also where deep understanding shows the most: optimization without measurement is just
guesswork.

## Concept map

### Basics
- [ ] Performance metrics: LCP, INP, CLS (Core Web Vitals), TTFB, FCP
- [ ] Lighthouse and how to read its report
- [ ] DevTools: the Network and Performance panels
- [ ] Optimizing images, fonts, and lazy loading

### Intermediate
- [ ] The RAIL model and the PRPL pattern
- [ ] The critical rendering path, render-blocking resources
- [ ] Lab data vs field data (CrUX, RUM with the `web-vitals` library)
- [ ] Code splitting, preload, prefetch
- [ ] Long tasks and how to break them up (`scheduler.yield`)
- [ ] List virtualization

### Deep dive
- [ ] The rendering pipeline: style → layout → paint → composite; layers and the GPU
- [ ] Layout thrashing (forced synchronous layout)
- [ ] How INP is measured: input delay, processing time, presentation delay
- [ ] Memory profiling
- [ ] Performance budgets in CI

## How to learn

1. Record one slow interaction in the Performance panel, then identify the long task and its cause.
2. Add the `web-vitals` library to a real project and send its data to your own endpoint for a week.
3. Cause layout thrashing on purpose (read `offsetHeight` then write `style` in a loop), measure it, then fix it.
4. Throttle the CPU 6x + Slow 4G in DevTools and use your app for 10 minutes.

## Check your understanding

1. Why doesn't a Lighthouse score of 100 guarantee passing Core Web Vitals in the field?
2. What are the parts of LCP (TTFB, resource load delay, load time, render delay), and how do you optimize each?
3. Why is animating `transform` cheaper than `left`?
4. How do `font-display` and `size-adjust` affect CLS?
5. Why can putting `React.memo` on every component slow your app down?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | Get one page to "Good" on all Core Web Vitals | Metrics |
| Intermediate | A simple RUM dashboard from `web-vitals` data | Field data |
| Deep | A virtualized list component from scratch (dynamic heights) | Rendering, scrolling |

## Primary sources

- [web.dev: Web Vitals](https://web.dev/articles/vitals) and [Optimize LCP/INP/CLS](https://web.dev/explore/learn-core-web-vitals)
- [Chrome DevTools: Performance](https://developer.chrome.com/docs/devtools/performance)
- [HTML spec: update the rendering](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering)

## Related toolkit

- [`@chalidade/utils`](../toolkit/utils.md): `debounce`, `throttle`
- [`@chalidade/react-hooks`](../toolkit/react-hooks.md): `useIntersectionObserver`, `useThrottledCallback`
- [`useVirtualList`](../toolkit/react-hooks.md#usevirtuallist) in `@chalidade/react-hooks`
- Deep dive: [Efficiency in React](../deep-dives/react-efficiency.md)
- Deep dive: [How V8 works](../deep-dives/v8.md)
- Deep dive: [Browser Rendering Pipeline](../deep-dives/browser-rendering-pipeline.md)
- Deep dive: [HTTP Caching](../deep-dives/http-caching.md)
