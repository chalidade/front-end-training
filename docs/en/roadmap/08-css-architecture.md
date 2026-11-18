# 08 · CSS Architecture & Tools

> **Phase:** 3 · **Estimate:** 2 weeks · **Prerequisites:** [03 CSS](03-css.md), [07 Framework](07-framework.md)

## Why it matters

CSS is easy to write but hard to maintain at scale because everything is global. CSS architecture is
how you keep scope, specificity, and visual consistency under control as your team and codebase grow.

## Concept map

### Basics
- [ ] Methodologies: BEM (OOCSS, SMACSS, ITCSS for context)
- [ ] Utility-first: Tailwind CSS
- [ ] Preprocessors: Sass; post-processors: PostCSS (autoprefixer, nesting)

### Intermediate
- [ ] CSS Modules (scoping via the build tool)
- [ ] Runtime CSS-in-JS (styled-components, Emotion) vs zero-runtime (Vanilla Extract, Panda CSS, Linaria)
- [ ] Design tokens: primitive → semantic → component tokens
- [ ] Component libraries: shadcn/ui (copy-paste), Mantine, Radix (headless)
- [ ] Theming and dark mode

### Deep dive
- [ ] The runtime cost of CSS-in-JS (style serialization, rule insertion) and its impact in React 18+
- [ ] How Tailwind's JIT works: scan sources → generate CSS
- [ ] `@layer` as the native solution to specificity conflicts
- [ ] Design systems: governance, versioning, documentation

## How to learn

1. Style the same Card component with 5 approaches: BEM, CSS Modules, Tailwind, styled-components,
   Vanilla Extract. Compare bundle size and the authoring experience.
2. Measure the runtime cost of CSS-in-JS with the Performance panel on a 1,000-item list.
3. Design tokens for light/dark themes with three tiers (primitive, semantic, component).

## Check your understanding

1. What problem does BEM solve, and what problem doesn't it?
2. Why is runtime CSS-in-JS a problem for streaming SSR and Server Components?
3. What are the trade-offs of copy-paste components (shadcn/ui) versus a versioned library (npm)?
4. When does utility-first become unreadable, and how do you deal with it?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | Convert a BEM page to Tailwind | Methodologies |
| Intermediate | A design token package that outputs CSS variables + TS constants | Tokens |
| Deep | A small PostCSS plugin (for example converting `px` to `rem`) | The CSS AST |

## Primary sources

- [BEM](https://getbem.com/), [Tailwind docs](https://tailwindcss.com/docs)
- [Design Tokens Community Group format](https://tr.designtokens.org/format/)
- [PostCSS: Writing a plugin](https://postcss.org/docs/writing-a-postcss-plugin)

## Related toolkit

- [`@chalidade/utils`](../toolkit/utils.md): `cx`
- [`@chalidade/tokens`](../toolkit/tokens.md): primitive + semantic tokens, light/dark themes
- Deep dive: [Design systems: tokens, governance, versioning](../deep-dives/design-system.md)
