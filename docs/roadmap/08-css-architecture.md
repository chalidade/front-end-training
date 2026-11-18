# 08 · CSS Architecture & Tools

> **Fase:** 3 · **Estimasi:** 2 minggu · **Prasyarat:** [03 CSS](03-css.md), [07 Framework](07-framework.md)

## Kenapa ini penting

CSS mudah ditulis tapi sulit dijaga di skala besar karena semuanya global. Arsitektur CSS adalah
cara mengendalikan scope, specificity, dan konsistensi visual saat tim dan codebase membesar.

## Peta konsep

### Dasar
- [ ] Metodologi: BEM, (OOCSS, SMACSS, ITCSS untuk konteks)
- [ ] Utility-first: Tailwind CSS
- [ ] Preprocessor: Sass; post-processor: PostCSS (autoprefixer, nesting)

### Menengah
- [ ] CSS Modules (scope lewat build tool)
- [ ] CSS-in-JS runtime (styled-components, Emotion) vs zero-runtime (Vanilla Extract, Panda CSS, Linaria)
- [ ] Design tokens: primitive → semantic → component tokens
- [ ] Component library: shadcn/ui (copy-paste), Mantine, Radix (headless)
- [ ] Theming dan dark mode

### Deep dive
- [ ] Biaya runtime CSS-in-JS (serialisasi style, insert rule) dan dampaknya di React 18+
- [ ] Cara Tailwind JIT bekerja: scan source → generate CSS
- [ ] `@layer` sebagai solusi native untuk konflik specificity
- [ ] Design system: governance, versioning, dokumentasi

## Cara belajar

1. Styling satu komponen Card yang sama dengan 5 pendekatan: BEM, CSS Modules, Tailwind,
   styled-components, Vanilla Extract. Bandingkan ukuran bundle dan pengalaman menulisnya.
2. Ukur biaya runtime CSS-in-JS dengan Performance panel pada list 1.000 item.
3. Rancang token untuk tema light/dark dengan tiga lapis (primitive, semantic, component).

## Uji pemahaman

1. Masalah apa yang diselesaikan BEM, dan masalah apa yang tidak?
2. Kenapa CSS-in-JS runtime bermasalah dengan streaming SSR dan Server Components?
3. Apa trade-off copy-paste component (shadcn/ui) dibanding library ber-versi (npm)?
4. Kapan utility-first jadi tidak bisa dibaca, dan bagaimana mengatasinya?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Konversi halaman BEM ke Tailwind | Metodologi |
| Menengah | Paket design tokens yang menghasilkan CSS variables + TS constants | Tokens |
| Deep | Plugin PostCSS kecil (misalnya mengubah `px` ke `rem`) | AST CSS |

## Sumber primer

- [BEM](https://getbem.com/), [Tailwind docs](https://tailwindcss.com/docs)
- [Design Tokens Community Group format](https://tr.designtokens.org/format/)
- [PostCSS: Writing a plugin](https://postcss.org/docs/writing-a-postcss-plugin)

## Toolkit terkait

- [`@chalidade/utils`](../toolkit/utils.md): `cx`
- [`@chalidade/tokens`](../toolkit/tokens.md): token primitif + semantik, tema terang/gelap
- Deep dive: [Design system: tokens, governance, versioning](../deep-dives/design-system.md)
