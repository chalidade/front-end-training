# 09 · Build Tools

> **Fase:** 4 · **Estimasi:** 2–3 minggu · **Prasyarat:** [06 Package Managers](06-package-managers.md)

## Kenapa ini penting

Build tool menentukan apa yang benar-benar sampai ke browser user. Ukuran bundle, kecepatan dev
server, dan bug "jalan di dev tapi rusak di prod" semuanya bersumber dari sini.

## Peta konsep

### Dasar
- [ ] Kenapa butuh bundler: module graph, transpilation, minification
- [ ] Vite sebagai default modern (dev server ESM + Rollup/Rolldown untuk build)
- [ ] Bundler: Webpack, Rollup, Parcel, esbuild
- [ ] Transpiler/compiler: Babel, SWC, esbuild

### Menengah
- [ ] Tree-shaking dan `sideEffects`
- [ ] Code splitting: dynamic `import()`, chunk strategy
- [ ] Hashing nama file dan long-term caching
- [ ] Source maps
- [ ] Environment variables dan dead code elimination
- [ ] Browserslist, polyfill, dan target

### Deep dive
- [ ] Bagaimana bundler membangun module graph dan melakukan scope hoisting
- [ ] Hot Module Replacement: protokol dan boundary
- [ ] Kenapa esbuild/SWC/Rolldown cepat (bahasa native, paralelisme, minim pass AST)
- [ ] Module Federation

## Cara belajar

1. Buat project Vite, jalankan `vite build`, lalu analisis hasilnya dengan `rollup-plugin-visualizer`.
2. Import satu fungsi dari `lodash` vs `lodash-es` dan bandingkan ukuran bundle-nya.
3. Tulis plugin Vite sederhana (misalnya inject build timestamp).
4. Baca output Rollup untuk dua modul kecil dan amati scope hoisting.

## Uji pemahaman

1. Kenapa tree-shaking gagal pada modul CommonJS?
2. Apa yang dilakukan field `sideEffects: false`, dan kapan berbahaya?
3. Kenapa Vite dev server cepat padahal tidak melakukan bundling saat development?
4. Bagaimana content hash di nama file membuat `Cache-Control: immutable` aman?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Migrasi project Webpack (CRA) ke Vite | Konfigurasi |
| Menengah | Kurangi bundle aplikasi nyata minimal 30% dengan analisis + code splitting | Optimasi |
| Deep | **Mini bundler:** parse import dengan parser JS, bangun graph, keluarkan satu file bundle | Module graph |

## Sumber primer

- [Vite: Why Vite](https://vite.dev/guide/why) dan [Plugin API](https://vite.dev/guide/api-plugin)
- [Rollup docs](https://rollupjs.org/)
- [esbuild: architecture notes](https://github.com/evanw/esbuild/blob/main/docs/architecture.md)

## Toolkit terkait

- Package di repo ini di-build dengan tsup (berbasis esbuild)
- Deep dive: [Module bundler dari nol](../deep-dives/module-bundler.md)
