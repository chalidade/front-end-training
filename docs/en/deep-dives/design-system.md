# Deep Dive: Design Systems, Tokens, Governance, Versioning

> Related: [08 CSS Architecture](../roadmap/08-css-architecture.md). Other deep dives:
> [CSS Cascade & Specificity](css-cascade.md), [Accessibility tree](accessibility-tree.md)

## Opening questions

The design team changes the brand color from indigo to blue. How many files do you have to touch?
If the answer is "find every `#4f46e5` and replace it", your design system isn't working yet. Then
come the harder questions: if a token is removed, is that a breaking change? Who is allowed to add a
new component to the shared library? And how do you know the dark theme still passes contrast after
someone changes a single color?

## Mental model

A design system is not a pile of components. It is an **internal product** with three layers:

```
 ┌──────────────────────────────────────────────────────────────┐
 │ Governance   who decides, contributions, versions, releases  │
 ├──────────────────────────────────────────────────────────────┤
 │ Components   Button, Dialog, Tabs: behavior + accessibility  │
 ├──────────────────────────────────────────────────────────────┤
 │ Tokens       design decisions as data (color, spacing...)    │
 └──────────────────────────────────────────────────────────────┘
```

Tokens themselves usually come in three tiers. Each tier may only point to the tier below it:

```
 component     button.bg ─────────┐
                                  ▼
 semantic      theme.primary ─────┐        (light)   theme.primary ──┐ (dark)
                                  ▼                                  ▼
 primitive     color.indigo.600 = #4f46e5            color.indigo.500 = #6366f1
```

- **Primitive** answers "which values exist?". The names are neutral: `indigo.600`, `space.4`.
- **Semantic** answers "what is this value for?": `primary`, `fgMuted`, `danger`. Dark mode and
  rebranding happen in this tier.
- **Component** answers "which part of this component?": `button.bg`, `input.borderFocus`.
  Optional; useful when one component needs to diverge without changing a semantic token.

The practical rule: **components read only semantic or component tokens, never primitives.** The
moment `color: var(--fet-color-indigo-600)` appears inside a component, rebranding is back to being
a find-and-replace job.

## Detailed mechanism

### 1. Tokens are data; CSS is just one output

The [`@chalidade/tokens`](../toolkit/tokens.md) package in this repo stores tokens as TypeScript
objects, and `flatten()` turns them into CSS variables:

```ts
// packages/tokens/src/tokens.ts (abridged)
export const color = { indigo: { 400: "#818cf8", 600: "#4f46e5" }, white: "#ffffff", slate: { 950: "#020617" } };
export const theme = {
  light: { primary: color.indigo[600], onPrimary: color.white },
  dark: { primary: color.indigo[400], onPrimary: color.slate[950] },
};
```

```css
/* dist/tokens.css (abridged) */
:root { --fet-color-indigo-600: #4f46e5; --fet-theme-primary: #4f46e5; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --fet-theme-primary: #818cf8; }
}
[data-theme="dark"] { --fet-theme-primary: #818cf8; }
```

One source can produce many outputs: CSS variables for the web, TypeScript constants, Android
resources, Swift for iOS, Figma variables. That is what tools like
[Style Dictionary](https://styledictionary.com/) do. So the format matters: the **Design Tokens
Community Group (DTCG)** standardizes a JSON file with `$value`, `$type`, and aliases written as
`"{color.indigo.600}"`, so design tools and build tools can exchange tokens without manual
conversion.

### 2. Aliases, resolution, and the two most common mistakes

With aliases, the semantic and component tiers store no values, only **references**. The resolver
follows references until it reaches a raw value. There are two ways to fail: a reference to a token
that doesn't exist (a typo), and a circular reference. A good resolver rejects both at build time
instead of silently emitting broken CSS. The code is in Experiment 2.

The semantic tokens in `@chalidade/tokens` use TypeScript object references
(`primary: color.indigo[600]`), so a typo is immediately a type error. That is the
compiler-checked version of an alias.

### 3. Theming means swapping the semantic tier

Dark mode adds no new tokens. It provides **different values for the same semantic keys**. Because
the keys are identical (`ThemeToken` in this package is `keyof theme.light`), components don't know
and don't need to know which mode is active. CSS variables make the swap cheap: the browser only
recomputes the inherited variable values, without loading a new stylesheet.

The consequence is that every semantic color pair (`fg` on `bg`, `onPrimary` on `primary`) must
pass contrast **in every mode**. That check is easy to automate, and Experiment 1 shows why it's
needed.

### 4. Versioning: tokens are a public API

Once a token package is consumed by other apps, token names are a **contract**. With
[Semantic Versioning](https://semver.org/):

| Change | Example | Impact on consumers | Bump |
| --- | --- | --- | --- |
| Remove or rename a token | `zIndex.dropdown` → `zIndex.popover` | `var(--fet-z-index-dropdown)` becomes empty with no error | **major** |
| Add a token | `theme.info` | none | minor |
| Change a token's value | `dark.primary` `#6366f1` → `#4f46e5` | looks different, code still works | patch or minor |

The first row is the most dangerous because **CSS gives no error**. An undefined variable makes the
property fall back to its initial value (`background: var(--missing)` becomes transparent). A safe
rename therefore happens in stages: add the new name, keep the old name as an alias marked
*deprecated* (the DTCG format has a `$deprecated` property for this), then remove it in the next
major release.

Changing a value is a gray area. The code doesn't break, but every consumer's screenshot tests can
turn red. Pick one rule and write it in the contribution guide; consistency matters more than the
choice itself. This repo uses [changesets](https://github.com/changesets/changesets): every PR that
changes a package includes a `.changeset/*.md` file with the bump type and a note, and the
changelog is generated from those.

### 5. Governance: who decides what

Nathan Curtis describes three team models for a design system:

| Model | How it works | Strength | Risk |
| --- | --- | --- | --- |
| **Solitary** | one product team builds a system for itself, then "shares" it | fast to start | other teams don't feel ownership |
| **Centralized** | a dedicated team builds and maintains the system for everyone | quality and consistency | becomes a bottleneck, drifts from product needs |
| **Federated** | representatives from several product teams contribute together | relevant and scalable | needs coordination and clear ground rules |

Whatever the model, healthy governance answers these questions in writing:

- **When does something enter the system?** A common rule: after the same pattern shows up in two
  or three products. A component used once is better left in that product for now.
- **How do people contribute?** Proposal, design and accessibility review, implementation,
  documentation, release.
- **How do teams diverge?** Product teams will always need variants. Provide an official escape
  hatch (component tokens, slots, `className`) so divergence doesn't become a silent fork.
- **How is adoption measured?** For example, the share of imports from the system package versus
  local components, or the number of raw hex colors still left in product code.

### 6. Versioned library or copy-paste?

The two ways of distributing components have opposite trade-offs:

- **Versioned npm packages** (Material UI, Mantine, `@chalidade/*`): bug and accessibility fixes
  reach every consumer with one upgrade. The cost: deep customization is limited, and major
  upgrades can be heavy.
- **Copy-paste** (shadcn/ui): the code becomes yours to change freely. The cost: upstream fixes
  don't arrive on their own, and every copy slowly drifts.

Many teams combine both: **tokens and behavior primitives** (focus traps, popover positioning,
ARIA) ship as versioned packages because they are hard to get right, while **component visuals**
may be copied and adapted.

## Experiments

Run from the repo root after `pnpm --filter @chalidade/tokens build`. The output below is real.

**1. Contrast audit of every semantic pair.** The relative luminance and contrast ratio formulas
come from WCAG 2.x.

```js
import { theme } from "./packages/tokens/dist/index.js";

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const pairs = [["fg", "bg"], ["fgMuted", "bg"], ["onPrimary", "primary"], ["primary", "bg"],
  ["danger", "bg"], ["warning", "bg"], ["success", "bg"], ["border", "bg"]];
for (const mode of ["light", "dark"]) {
  for (const [f, b] of pairs) {
    const r = ratio(theme[mode][f], theme[mode][b]);
    console.log(mode, `${f}/${b}`, r.toFixed(2), r >= 4.5 ? "AA" : r >= 3 ? "AA-large/UI" : "GAGAL");
  }
}
```

```
light fg/bg              17.85 AA
light fgMuted/bg         7.58 AA
light onPrimary/primary  6.29 AA
light primary/bg         6.29 AA
light danger/bg          4.83 AA
light warning/bg         5.02 AA
light success/bg         5.02 AA
light border/bg          1.23 GAGAL
dark  fg/bg              18.41 AA
dark  fgMuted/bg         7.87 AA
dark  onPrimary/primary  4.47 AA-large/UI
dark  primary/bg         4.52 AA
dark  danger/bg          7.29 AA
dark  warning/bg         12.08 AA
dark  success/bg         11.58 AA
dark  border/bg          1.38 GAGAL
```

(`GAGAL` means "fail".) Two real findings in this repo's tokens:

- `border` fails in both modes. That's fine as long as borders are purely decorative. If a border
  is the only thing marking an input's boundary, WCAG 1.4.11 requires at least 3:1, so inputs need
  their own token (for example `borderStrong`).
- **White text on the dark-mode `primary` is only 4.47:1**, just under 4.5:1 for normal text. A
  button with a small label doesn't pass AA in dark mode. Light mode passes, so anyone who checks
  only one mode will never see this bug. That's why a contrast audit should run in CI for every
  mode.

::: tip Now fixed
The output above comes from the tokens before the fix (commit `36576cb`). Since then, dark mode
uses `primary` indigo-400 with `onPrimary` slate-950 (6.76:1), and light-mode `accent` moved from
cyan-600 (3.68:1) to cyan-700 (5.36:1). This audit now runs as a test in
`packages/tokens/src/index.test.ts`, so CI rejects tokens that drop below AA. If you run this
experiment on main, only `border` still shows `GAGAL`.
:::

**2. A mini DTCG alias resolver.** Three token tiers, a one-line rebrand, and two mistakes that
must be caught at build time.

```js
const tokens = {
  color: {
    indigo: { 600: { $type: "color", $value: "#4f46e5" }, 700: { $type: "color", $value: "#4338ca" } },
    white: { $type: "color", $value: "#ffffff" },
  },
  semantic: {
    primary: { $value: "{color.indigo.600}" },
    primaryHover: { $value: "{color.indigo.700}" },
    onPrimary: { $value: "{color.white}" },
  },
  button: {
    bg: { $value: "{semantic.primary}" },
    bgHover: { $value: "{semantic.primaryHover}" },
    fg: { $value: "{semantic.onPrimary}" },
  },
};

function get(path) {
  const node = path.split(".").reduce((n, k) => n?.[k], tokens);
  if (!node || !("$value" in node)) throw new Error(`token tidak ada: ${path}`);
  return node;
}
function resolve(path, seen = []) {
  if (seen.includes(path)) throw new Error(`alias melingkar: ${[...seen, path].join(" → ")}`);
  const { $value } = get(path);
  const m = /^\{(.+)\}$/.exec($value);
  return m ? resolve(m[1], [...seen, path]) : { value: $value, chain: [...seen, path] };
}

for (const p of ["button.bg", "button.fg"]) {
  const r = resolve(p);
  console.log(p, "=", r.value, " via", r.chain.join(" → "));
}
tokens.semantic.primary.$value = "{color.indigo.700}";   // rebrand: one line
console.log("setelah rebrand: button.bg =", resolve("button.bg").value);
tokens.semantic.primary.$value = "{button.bg}";           // wrong: points upward
try { resolve("button.bg"); } catch (e) { console.log(e.message); }
tokens.button.fg.$value = "{semantic.onPrimery}";         // typo
try { resolve("button.fg"); } catch (e) { console.log(e.message); }
```

```
button.bg = #4f46e5  via button.bg → semantic.primary → color.indigo.600
button.fg = #ffffff  via button.fg → semantic.onPrimary → color.white
setelah rebrand: button.bg = #4338ca
alias melingkar: button.bg → semantic.primary → button.bg
token tidak ada: semantic.onPrimery
```

(The messages are in Indonesian: "after rebrand", "circular alias", "token does not exist".) The
circular alias happens because a semantic token points at a component token, breaking the "only
point downward" rule. A token linter can reject that direction before the cycle ever forms.

**3. Deriving the version from a token diff.** Compare two flattened versions of the tokens, then
derive the bump type from the table in section 4.

```js
import { flatten, theme, tokens } from "./packages/tokens/dist/index.js";

const before = flatten({ ...tokens, theme });
const next = structuredClone({ ...tokens, theme });
next.theme.dark.primary = "#4f46e5";                                   // change a value
next.theme.light.info = "#0284c7"; next.theme.dark.info = "#38bdf8";   // add
next.zIndex.popover = next.zIndex.dropdown; delete next.zIndex.dropdown; // rename
const after = flatten(next);

const removed = Object.keys(before).filter((k) => !(k in after));
const added = Object.keys(after).filter((k) => !(k in before));
const changed = Object.keys(before).filter((k) => k in after && before[k] !== after[k]);
console.log({ removed, added, changed: changed.map((k) => `${k}: ${before[k]} → ${after[k]}`) });
const bump = removed.length ? "major" : added.length ? "minor" : changed.length ? "patch" : "none";
console.log("bump yang disarankan:", bump, "| total token:", Object.keys(before).length, "→", Object.keys(after).length);
```

```
{
  removed: [ '--fet-z-index-dropdown' ],
  added: [
    '--fet-z-index-popover',
    '--fet-theme-light-info',
    '--fet-theme-dark-info'
  ],
  changed: [ '--fet-theme-dark-primary: #818cf8 → #4f46e5' ]
}
bump yang disarankan: major | total token: 125 → 127
```

Renaming a single token is enough to make the release major, even though the other 124 tokens are
safe. Try again without the rename line: the result is `minor`.

Notice the trap in the value change, too. Indigo-600 looks like a fix for the contrast finding
above (white text on it is 6.29:1), but `primary` is also used as a text color on `bg`, and that
pair drops to 3.21:1. A token used for two roles (button background and text color) has
to pass in both. That's why the real fix changes three tokens at once (`primary`, `primaryHover`,
`onPrimary`), and the contrast test guards every pair.

Record your results and surprises in the [experiment notes](/en/notes/). Experiment 1 is now a test in
`packages/tokens`. Next challenge: turn Experiment 3 into a CI check that rejects a token rename
without a major changeset.

## Practical implications

- **Start with semantic tokens, not components.** Ten semantic tokens used consistently are worth
  more than fifty components that each use raw hex values.
- **Components must not read primitives.** Add a lint rule (for example Stylelint's
  `declaration-property-value-disallowed-list` or a variable-name check) to enforce it.
- **Test contrast for every mode in CI.** Contrast bugs usually show up only in the mode their
  author rarely opens.
- **Treat token names as an API.** Rename through deprecation, not outright removal, and let the
  token diff decide the version bump.
- **Write governance down before you need it:** entry criteria, the contribution flow, how to
  diverge, and versioning rules. Without them, product teams will fork.
- **Measure adoption.** A design system nobody uses is just documentation.

## Primary sources

- [Design Tokens Community Group: Format](https://tr.designtokens.org/format/) (`$value`, `$type`,
  aliases, `$deprecated`)
- [Style Dictionary](https://styledictionary.com/): one token source, many platforms
- [Material Design 3: Design tokens](https://m3.material.io/foundations/design-tokens/overview)
  (reference → system → component)
- [WCAG 2.2: 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG22/#contrast-minimum) and
  [1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast)
- [Semantic Versioning 2.0.0](https://semver.org/) and
  [changesets](https://github.com/changesets/changesets)
- Nathan Curtis, [*Team Models for Scaling a Design System*](https://medium.com/eightshapes-llc/team-models-for-scaling-a-design-system-2cf9d03be6a0)
- Brad Frost, [*Atomic Design*](https://atomicdesign.bradfrost.com/)
