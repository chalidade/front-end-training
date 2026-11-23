# 03 · CSS

> **Fase:** 1 · **Estimasi:** 3–4 minggu · **Prasyarat:** [02 HTML](02-html.md)

## Kenapa ini penting

CSS sering dipelajari lewat trial-and-error, sehingga banyak developer berpengalaman masih
"menebak" kenapa layout berantakan. CSS sebenarnya adalah kumpulan **algoritma layout** yang
deterministik. Begitu algoritmanya dipahami, bug CSS jadi bisa diprediksi.

## Peta konsep

### Dasar
- [ ] Selector, specificity, inheritance, cascade
- [ ] Box model, `box-sizing`, margin collapsing
- [ ] Display: block, inline, inline-block
- [ ] Positioning: static, relative, absolute, fixed, sticky
- [ ] Unit: `px`, `em`, `rem`, `%`, `vw/vh`, `dvh`, `ch`
- [ ] Making layouts: Flexbox dan Grid
- [ ] Responsive design: media query, mobile-first, fluid typography (`clamp()`)

### Menengah
- [ ] Stacking context dan `z-index`
- [ ] Block Formatting Context (BFC) dan kapan dibuat
- [ ] Custom properties (CSS variables) dan theming
- [ ] Transition, animation, dan properti yang murah untuk dianimasikan
- [ ] Container queries, `:has()`, `:is()`/`:where()`, nesting
- [ ] Cascade layers (`@layer`)
- [ ] Logical properties (`margin-inline`, dll.)

### Deep dive
- [ ] Algoritma cascade lengkap: origin, importance, layer, specificity, order
- [ ] Algoritma Flexbox: hypothetical main size, flex-grow/shrink resolution
- [ ] Grid: track sizing algorithm, `fr`, `minmax`, implicit grid
- [ ] Containing block dan cara menentukan percentage
- [ ] Rendering pipeline: style → layout → paint → composite, dan properti mana memicu yang mana

## Cara belajar

1. Untuk setiap konsep, buat satu CodePen kecil yang **memprediksi dulu** hasilnya, baru jalankan.
2. Pelajari Flexbox dan Grid dengan DevTools overlay (badge `flex`/`grid` di Elements panel).
3. Bangun ulang 3 layout nyata (dashboard, landing page, artikel) tanpa framework CSS.
4. Pelajari stacking context dengan membuat kasus `z-index: 9999` yang tetap kalah, lalu jelaskan.
5. Buka DevTools → **Rendering** → *Paint flashing* dan *Layout shift regions*, lalu animasikan
   `top` vs `transform` dan bandingkan.

## Uji pemahaman

1. Kenapa elemen dengan `z-index: 9999` bisa tertutup elemen dengan `z-index: 1`?
2. Kenapa `margin-top` anak bisa "keluar" dari parent-nya, dan tiga cara mencegahnya?
3. Dalam flex container 600px dengan dua item `flex: 1 1 400px` dan `flex: 2 1 400px`, berapa
   lebar akhir masing-masing? Tunjukkan perhitungannya.
4. Apa beda `1fr` dan `minmax(0, 1fr)`, dan kenapa grid bisa overflow karena teks panjang?
5. Kenapa `height: 100%` sering tidak bekerja? Apa hubungannya dengan containing block?
6. `@layer` mana yang menang: layer yang dideklarasikan pertama atau terakhir? Bagaimana dengan
   `!important` di dalam layer?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Landing page responsif mobile-first tanpa framework | Layout, responsive |
| Menengah | Sistem tema (light/dark/high contrast) hanya dengan custom properties | Variables, cascade |
| Deep | Implementasikan subset algoritma Flexbox di JS (satu baris, tanpa wrap) dan bandingkan hasilnya dengan browser | Algoritma layout |

## Sumber primer

- [CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/)
- [CSS Flexible Box Layout §9: Flex Layout Algorithm](https://www.w3.org/TR/css-flexbox-1/#layout-algorithm)
- [CSS Grid Layout §12: Grid Sizing](https://www.w3.org/TR/css-grid-2/#layout-algorithm)
- [Josh W. Comeau: CSS for JavaScript Developers](https://css-for-js.dev/) (berbayar, sangat bagus)
- [MDN: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)

## Toolkit terkait

- [`@chalidade/tokens`](../toolkit/tokens.md): design tokens sebagai custom properties
- [`@chalidade/utils`](../toolkit/utils.md): `cx` untuk className kondisional
- Deep dive: [CSS Cascade & Specificity](../deep-dives/css-cascade.md)
- Deep dive: [Internationalization (i18n)](../deep-dives/i18n.md): logical properties dan RTL
