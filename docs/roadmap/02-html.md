# 02 · HTML

> **Fase:** 1 · **Estimasi:** 1–2 minggu · **Prasyarat:** [01 Internet](01-internet.md)

## Kenapa ini penting

HTML adalah satu-satunya lapisan yang dibaca oleh semua pihak: browser, screen reader, crawler
mesin pencari, dan preview link. HTML yang semantik membuat aksesibilitas, SEO, dan perilaku
default browser (fokus, form, keyboard) bisa didapat tanpa JavaScript.

## Peta konsep

### Dasar
- [ ] Struktur dokumen, `<head>` vs `<body>`, metadata
- [ ] Semantic HTML: `header`, `nav`, `main`, `article`, `section`, `aside`, `footer`
- [ ] Form dan validasi: `input` types, `required`, `pattern`, `<label>`, `fieldset`
- [ ] Aksesibilitas dasar: alt text, heading hierarchy, label, landmark
- [ ] SEO dasar: `title`, meta description, canonical, Open Graph

### Menengah
- [ ] Accessibility tree dan cara screen reader membacanya
- [ ] ARIA: aturan pertama ARIA (jangan pakai ARIA kalau elemen native cukup), role, state, property
- [ ] Constraint Validation API (`setCustomValidity`, `:invalid`, `reportValidity`)
- [ ] `<dialog>`, `<details>`, `popover` attribute, `inert`
- [ ] Gambar responsif: `srcset`, `sizes`, `<picture>`, `loading="lazy"`
- [ ] Resource hints: `preload`, `preconnect`, `modulepreload`, `fetchpriority`

### Deep dive
- [ ] Algoritma parsing HTML: tokenizer, tree construction, error recovery
- [ ] Kenapa `<script>` memblokir parser, beda `defer` vs `async` vs `type="module"`
- [ ] Preload scanner
- [ ] Structured data (JSON-LD) dan rich results

## Cara belajar

1. Ambil satu halaman yang pernah kamu buat dan validasi di [validator.w3.org](https://validator.w3.org/nu/).
2. Buka DevTools → **Accessibility** pane (atau aktifkan *full accessibility tree*), bandingkan
   DOM tree dengan accessibility tree-nya.
3. Navigasi halaman itu **hanya dengan keyboard**, lalu dengan screen reader (VoiceOver / NVDA)
   selama 15 menit. Catat semua yang membingungkan.
4. Buat form pendaftaran lengkap tanpa JavaScript sama sekali, lalu tambahkan validasi kustom
   dengan Constraint Validation API.
5. Baca bagian [Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html)
   sampai paham kenapa `<p><div></div></p>` menghasilkan dua `<p>`.

## Uji pemahaman

1. Kenapa `<div onclick>` bukan pengganti `<button>`? Sebutkan minimal 4 perilaku yang hilang.
2. Kapan `<section>` membuat landmark dan kapan tidak?
3. Urutkan eksekusi: `<script>`, `<script defer>`, `<script async>`, `<script type="module">`
   di dokumen yang sama, dan jelaskan kaitannya dengan `DOMContentLoaded`.
4. Apa yang dilakukan browser dengan `<img srcset="a.jpg 1x, b.jpg 2x">` vs
   `<img srcset="a.jpg 400w, b.jpg 800w" sizes="...">`?
5. Kenapa `aria-label` pada `<div>` biasa sering diabaikan screen reader?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Halaman artikel blog yang lolos validator dan skor Lighthouse a11y/SEO 100 | Semantik, SEO |
| Menengah | Form multi-step tanpa JS (progressive enhancement), lalu ditingkatkan dengan JS | Form, validasi |
| Deep | Tulis tokenizer HTML sederhana (subset spec) yang mengubah string jadi token | Parsing |

## Sumber primer

- [HTML Living Standard (WHATWG)](https://html.spec.whatwg.org/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Google Search Central: SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

## Toolkit terkait

- (rencana) `@chalidade/ui`: semua komponen mengikuti pola APG
- Deep dive: [Accessibility tree & cara screen reader bekerja](../deep-dives/accessibility-tree.md)
- Deep dive: [Internationalization (i18n)](../deep-dives/i18n.md): `lang`, `dir`, `Intl`
