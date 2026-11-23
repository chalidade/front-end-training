# 03 · CSS

> **Phase:** 1 · **Estimate:** 3–4 weeks · **Prerequisites:** [02 HTML](02-html.md)

## Why it matters

CSS is often learned by trial and error, so many experienced developers still "guess" why a layout
breaks. CSS is actually a set of deterministic **layout algorithms**. Once you understand the
algorithms, CSS bugs become predictable.

## Concept map

### Basics
- [ ] Selectors, specificity, inheritance, the cascade
- [ ] Box model, `box-sizing`, margin collapsing
- [ ] Display: block, inline, inline-block
- [ ] Positioning: static, relative, absolute, fixed, sticky
- [ ] Units: `px`, `em`, `rem`, `%`, `vw/vh`, `dvh`, `ch`
- [ ] Making layouts: Flexbox and Grid
- [ ] Responsive design: media queries, mobile-first, fluid typography (`clamp()`)

### Intermediate
- [ ] Stacking contexts and `z-index`
- [ ] Block Formatting Context (BFC) and when one is created
- [ ] Custom properties (CSS variables) and theming
- [ ] Transitions, animations, and which properties are cheap to animate
- [ ] Container queries, `:has()`, `:is()`/`:where()`, nesting
- [ ] Cascade layers (`@layer`)
- [ ] Logical properties (`margin-inline`, etc.)

### Deep dive
- [ ] The full cascade algorithm: origin, importance, layer, specificity, order
- [ ] The Flexbox algorithm: hypothetical main size, flex-grow/shrink resolution
- [ ] Grid: the track sizing algorithm, `fr`, `minmax`, the implicit grid
- [ ] Containing blocks and how percentages are resolved
- [ ] The rendering pipeline: style → layout → paint → composite, and which properties trigger which

## How to learn

1. For each concept, make a small CodePen and **predict** the result first, then run it.
2. Learn Flexbox and Grid with the DevTools overlays (the `flex`/`grid` badges in the Elements panel).
3. Rebuild 3 real layouts (dashboard, landing page, article) without a CSS framework.
4. Learn stacking contexts by building a case where `z-index: 9999` still loses, then explain it.
5. Open DevTools → **Rendering** → *Paint flashing* and *Layout shift regions*, then animate `top` vs
   `transform` and compare.

## Check your understanding

1. Why can an element with `z-index: 9999` be covered by an element with `z-index: 1`?
2. Why can a child's `margin-top` "escape" its parent, and what are three ways to prevent it?
3. In a 600px flex container with two items, `flex: 1 1 400px` and `flex: 2 1 400px`, what's each
   item's final width? Show the calculation.
4. What's the difference between `1fr` and `minmax(0, 1fr)`, and why can a grid overflow because of long text?
5. Why does `height: 100%` often not work? How does it relate to the containing block?
6. Which `@layer` wins: the one declared first or last? What about `!important` inside a layer?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | A mobile-first responsive landing page without a framework | Layout, responsive |
| Intermediate | A theme system (light/dark/high contrast) using only custom properties | Variables, cascade |
| Deep | Implement a subset of the Flexbox algorithm in JS (single line, no wrap) and compare it to the browser | Layout algorithms |

## Primary sources

- [CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/)
- [CSS Flexible Box Layout §9: Flex Layout Algorithm](https://www.w3.org/TR/css-flexbox-1/#layout-algorithm)
- [CSS Grid Layout §12: Grid Sizing](https://www.w3.org/TR/css-grid-2/#layout-algorithm)
- [Josh W. Comeau: CSS for JavaScript Developers](https://css-for-js.dev/) (paid, excellent)
- [MDN: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)

## Related toolkit

- [`@chalidade/tokens`](../toolkit/tokens.md): design tokens as custom properties
- [`@chalidade/utils`](../toolkit/utils.md): `cx` for conditional classNames
- Deep dive: [CSS Cascade & Specificity](../deep-dives/css-cascade.md)
- Deep dive: [Internationalization (i18n)](../deep-dives/i18n.md): logical properties and RTL
