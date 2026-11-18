# 07 · Framework (React & lainnya)

> **Fase:** 3 · **Estimasi:** 4–6 minggu · **Prasyarat:** [04 JavaScript](04-javascript.md)

## Kenapa ini penting

Framework menyelesaikan satu masalah inti: **menjaga UI tetap sinkron dengan state**. Setiap
framework punya jawaban berbeda (virtual DOM, compiler, signals). Kuasai satu framework secara
mendalam, dan pahami cukup tentang yang lain untuk menilai trade-off-nya.

**Rekomendasi:** React sebagai fokus utama (ekosistem dan pasar kerja terbesar). Vue, Angular,
Svelte, Solid, dan Qwik dipelajari sebagai pembanding.

## Peta konsep

### Dasar (React)
- [ ] JSX, component, props, state
- [ ] Hooks: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useContext`
- [ ] Rendering list dan `key`
- [ ] Controlled vs uncontrolled form
- [ ] Routing (react-router / framework router)

### Menengah
- [ ] Kapan component re-render, dan kenapa `memo` kadang tidak membantu
- [ ] Aturan `useEffect`: dependency array, cleanup, "you might not need an effect"
- [ ] State management: lokal vs lifted vs context vs store eksternal (Zustand, Redux Toolkit)
- [ ] Server state vs client state (TanStack Query)
- [ ] Composition pattern: compound component, render props, headless component
- [ ] Error boundary, Suspense

### Deep dive
- [ ] Reconciliation dan algoritma diffing
- [ ] Fiber architecture: work loop, lanes, concurrent rendering, `useTransition`
- [ ] React Server Components dan model serialisasinya
- [ ] React Compiler: auto-memoization
- [ ] Perbandingan model reactivity: VDOM (React) vs fine-grained signals (Solid, Vue, Angular signals) vs compiler (Svelte)

## Cara belajar

1. Baca [react.dev/learn](https://react.dev/learn) sampai selesai, termasuk bagian *Escape Hatches*.
2. Pasang React DevTools Profiler dan aktifkan *Highlight updates*, lalu buat aplikasi yang re-render
   berlebihan dan perbaiki.
3. Tulis ulang satu fitur kecil yang sama di React, Vue, Svelte, dan Solid. Catat perbedaan mental model-nya.
4. Bangun mini React (lihat proyek deep) **sebelum** membaca source React.
5. Baca source React mulai dari `packages/react-reconciler/src/ReactFiberWorkLoop.js`.

## Uji pemahaman

1. Kenapa `key={index}` bisa menyebabkan bug state di list yang bisa diurutkan ulang?
2. Kenapa `useEffect` jalan dua kali di development (Strict Mode), dan apa yang ingin diajarkan dari situ?
3. Apa yang terjadi saat context value berubah? Bagaimana mencegah semua consumer re-render?
4. Jelaskan beda *render phase* dan *commit phase*. Kenapa render phase harus murni?
5. Bagaimana signals (Solid) bisa update DOM tanpa menjalankan ulang component function?
6. Apa yang dikirim server ke client dalam React Server Components?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Aplikasi CRUD dengan routing, form, dan fetch | Dasar React |
| Menengah | Dashboard dengan TanStack Query, optimistic update, dan state URL | Server state |
| Deep | **Mini React:** `createElement`, render, reconciliation, `useState`, `useEffect` (ikuti [Build your own React](https://pomb.us/build-your-own-react/)) | Fiber, reconciliation |
| Deep | Mini signals library (`signal`, `computed`, `effect`) | Fine-grained reactivity |

## Sumber primer

- [react.dev](https://react.dev/) dan [source React](https://github.com/facebook/react)
- [Vue: Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [SolidJS docs](https://docs.solidjs.com/), [Svelte docs](https://svelte.dev/docs)
- [Dan Abramov: overreacted.io](https://overreacted.io/)

## Toolkit terkait

- [`@chalidade/react-hooks`](../toolkit/react-hooks.md): `useDebouncedCallback`, `useThrottledCallback`, `useLatest`, dll.
- Deep dive: [Efisiensi di React](../deep-dives/react-efficiency.md), [React Fiber dari source code](../deep-dives/react-fiber.md), [Signals](../deep-dives/signals.md)
- (rencana) `@chalidade/ui`: headless + styled components
