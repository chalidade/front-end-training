# 02 · HTML

> **Phase:** 1 · **Estimate:** 1–2 weeks · **Prerequisites:** [01 Internet](01-internet.md)

## Why it matters

HTML is the only layer read by every party: browsers, screen readers, search engine crawlers, and link
previews. Semantic HTML gives you accessibility, SEO, and the browser's default behavior (focus, forms,
keyboard) without any JavaScript.

## Concept map

### Basics
- [ ] Document structure, `<head>` vs `<body>`, metadata
- [ ] Semantic HTML: `header`, `nav`, `main`, `article`, `section`, `aside`, `footer`
- [ ] Forms and validation: `input` types, `required`, `pattern`, `<label>`, `fieldset`
- [ ] Accessibility basics: alt text, heading hierarchy, labels, landmarks
- [ ] SEO basics: `title`, meta description, canonical, Open Graph

### Intermediate
- [ ] The accessibility tree and how screen readers read it
- [ ] ARIA: the first rule of ARIA (don't use ARIA if a native element will do), roles, states, properties
- [ ] Constraint Validation API (`setCustomValidity`, `:invalid`, `reportValidity`)
- [ ] `<dialog>`, `<details>`, the `popover` attribute, `inert`
- [ ] Responsive images: `srcset`, `sizes`, `<picture>`, `loading="lazy"`
- [ ] Resource hints: `preload`, `preconnect`, `modulepreload`, `fetchpriority`

### Deep dive
- [ ] The HTML parsing algorithm: tokenizer, tree construction, error recovery
- [ ] Why `<script>` blocks the parser; `defer` vs `async` vs `type="module"`
- [ ] The preload scanner
- [ ] Structured data (JSON-LD) and rich results

## How to learn

1. Take a page you've built and validate it at [validator.w3.org](https://validator.w3.org/nu/).
2. Open DevTools → the **Accessibility** pane (or enable the *full accessibility tree*), and compare the
   DOM tree with its accessibility tree.
3. Navigate that page **with the keyboard only**, then with a screen reader (VoiceOver / NVDA) for 15
   minutes. Write down everything that's confusing.
4. Build a complete sign-up form with no JavaScript at all, then add custom validation with the
   Constraint Validation API.
5. Read [Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html) until you
   understand why `<p><div></div></p>` produces two `<p>` elements.

## Check your understanding

1. Why isn't `<div onclick>` a replacement for `<button>`? Name at least 4 behaviors that are lost.
2. When does `<section>` create a landmark, and when doesn't it?
3. Order the execution of `<script>`, `<script defer>`, `<script async>`, and `<script type="module">`
   in the same document, and explain how they relate to `DOMContentLoaded`.
4. What does the browser do with `<img srcset="a.jpg 1x, b.jpg 2x">` vs
   `<img srcset="a.jpg 400w, b.jpg 800w" sizes="...">`?
5. Why do screen readers often ignore `aria-label` on a plain `<div>`?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | A blog article page that passes the validator and scores 100 on Lighthouse a11y/SEO | Semantics, SEO |
| Intermediate | A multi-step form without JS (progressive enhancement), then enhanced with JS | Forms, validation |
| Deep | Write a simple HTML tokenizer (a subset of the spec) that turns a string into tokens | Parsing |

## Primary sources

- [HTML Living Standard (WHATWG)](https://html.spec.whatwg.org/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Google Search Central: SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

## Related toolkit

- (planned) `@chalidade/ui`: every component follows APG patterns
- Deep dive: [The accessibility tree & how screen readers work](../deep-dives/accessibility-tree.md)
- Deep dive: [Internationalization (i18n)](../deep-dives/i18n.md): `lang`, `dir`, `Intl`
