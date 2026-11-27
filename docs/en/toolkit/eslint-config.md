# @chalidade/eslint-config

A shared ESLint flat config for JavaScript and TypeScript projects: the `recommended` presets from
ESLint and typescript-eslint, optional React Hooks rules, optional type-aware linting, and
`eslint-config-prettier` last so it never fights Prettier.

```bash
pnpm add -D eslint typescript @chalidade/eslint-config
# or
npm install -D eslint typescript @chalidade/eslint-config
```

::: warning Not yet published
This package isn't on npm yet. For now, copy the source from
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/eslint-config/src).
:::

## Usage

```js
// eslint.config.js
import { chalidade } from "@chalidade/eslint-config";

export default chalidade({ react: true });
```

The result is a plain flat config array, so you can extend or override it:

```js
export default [
  ...chalidade({ react: true, typeChecked: { tsconfigRootDir: import.meta.dirname } }),
  { files: ["scripts/**"], rules: { "no-console": "off" } },
];
```

| Option | Default | Meaning |
| --- | --- | --- |
| `react` | `false` | `eslint-plugin-react-hooks` rules (rules-of-hooks, exhaustive-deps, and the React Compiler rules) |
| `typeChecked` | `false` | `{ tsconfigRootDir }` to turn on rules that need type information |
| `env` | `["browser", "node"]` | known globals (`window`, `process`, …) |
| `ignores` | `[]` | extra patterns; `dist`, `build`, `coverage`, and `.vitepress/cache` are always ignored |

## What's inside

Order matters, because in flat config later entries override earlier ones:

1. **Ignores**: build output folders.
2. **`@eslint/js` recommended** and **typescript-eslint** `recommended` (or `recommendedTypeChecked`).
3. **Extra rules** (`extraRules`), few, and all about bugs or readability:
   - `eqeqeq: smart`: `===` everywhere, except `x == null`, which deliberately matches both `null` and `undefined`.
   - `no-console` (warn): `console.warn` and `console.error` are still allowed.
   - `prefer-const`, `no-var`.
   - `consistent-type-imports`: `import { type Foo }` is erased at build time, so a module imported
     only for its types isn't loaded.
   - `no-unused-vars` with a `_` prefix for parameters you intentionally don't use.
4. **React Hooks** when `react: true`.
5. **`eslint-config-prettier`** last: turns off every formatting rule that could conflict with
   Prettier. Formatting is Prettier's job, not the linter's (see
   [10 Linters & Formatters](/en/roadmap/10-linters-formatters)).

With `typeChecked`, `.js/.mjs/.cjs` files automatically get `disableTypeChecked`, because files
like `eslint.config.js` usually aren't part of `tsconfig.json`.

## Experiment: running it on this repo

The config was run against the 50 TypeScript files in this repo's `packages/*/src`, once without
and once with type-aware linting.

```text
mode         time      findings
default      1.5 s     react-hooks/exhaustive-deps ×3, react-hooks/refs ×1, react-hooks/purity ×1
typeChecked  5.6 s     all of the above, plus no-unnecessary-type-assertion ×6, no-floating-promises ×3,
                       no-unsafe-assignment ×2, unbound-method ×2, require-await ×1,
                       prefer-promise-reject-errors ×1
```

What's interesting isn't the count but the kinds of findings:

- **Type-aware linting is almost 4× slower**, because ESLint has to run the TypeScript compiler.
  In return it finds things you can't see from syntax alone, such as three promises in the tests
  that aren't `await`ed (`no-floating-promises`).
- **The three `exhaustive-deps` findings are intentional.** For example, `useLocalStorage`
  deliberately depends only on `raw`, and there's a comment saying so. Linters don't read
  comments, so decisions like this are better written as `// eslint-disable-next-line` with a
  reason.
- **`react-hooks/refs` in `usePrevious` is right.** Reading `ref.current` during render doesn't
  work with the React Compiler, and the React docs advise against it.
- **`react-hooks/purity` in `useThrottledCallback` is probably a false positive.** `Date.now()`
  is inside a function created in `useMemo` but only called from events, not during render.
  Linters are heuristics: read the reason before changing code.

## Deliberately left out

- **Style rules** (indentation, semicolons, import order). Prettier handles those, and style
  debates in code review are why formatters exist.
- **The full React plugin, jsx-a11y, and import plugins.** Each is good, but adds dependencies and
  lint time. Add them to the array `chalidade()` returns if your project needs them.
- **The `strict` presets.** Good for libraries, too noisy for an app that's just starting.

## Related concepts

[10 Linters & Formatters](/en/roadmap/10-linters-formatters) (AST, custom rules, codemods),
[07 Framework](/en/roadmap/07-framework) (Hooks rules), and
[`@chalidade/react-hooks`](/en/toolkit/react-hooks) (where the experiment above ran).

## Learn from the source

Suggested exercise: read
[`index.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/eslint-config/src/index.ts),
then answer these before looking at the tests. What happens if `eslint-config-prettier` moves to
the front? Why does `eqeqeq` use `"smart"` instead of `"always"`? Write a custom rule that bans
`fetch` without a timeout, then add it to the array `chalidade()` returns.
