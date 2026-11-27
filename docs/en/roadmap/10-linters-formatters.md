# 10 · Linters & Formatters

> **Phase:** 4 · **Estimate:** 3 days · **Prerequisites:** [09 Build Tools](09-build-tools.md)

## Why it matters

Linters and formatters turn team rules from code review debates into automation. Behind both is a very
useful concept, the **AST (Abstract Syntax Tree)**, which bundlers, compilers, and codemods use too.

## Concept map

### Basics
- [ ] Prettier: an opinionated formatter
- [ ] ESLint: flat config, rules, plugins (`typescript-eslint`, `eslint-plugin-react-hooks`, `jsx-a11y`)
- [ ] Editor integration and pre-commit hooks (lint-staged, husky / lefthook)

### Intermediate
- [ ] Linting (quality/bugs) vs formatting (style)
- [ ] Type-aware linting
- [ ] Fast alternatives: Biome, oxlint
- [ ] Stylelint for CSS

### Deep dive
- [ ] ASTs: ESTree, the visitor pattern
- [ ] Writing a custom ESLint rule
- [ ] Codemods with jscodeshift / ast-grep for large-scale migrations

## How to learn

1. Paste code into [AST Explorer](https://astexplorer.net/) and explore the shape of the tree.
2. Write one custom ESLint rule (for example, ban `console.log` except in certain files).
3. Write a codemod that replaces an old import with a new one across a whole repo.

## Check your understanding

1. How can `eslint-plugin-react-hooks` detect missing dependencies? What are its limits?
2. Why is running Prettier through ESLint (`eslint-plugin-prettier`) no longer recommended?
3. How does a linter know a variable is unused? (scope analysis)

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | Set up ESLint + Prettier + lint-staged in a project | Tooling |
| Intermediate | A custom ESLint rule for a team convention | AST, visitors |
| Deep | A codemod for an API migration (e.g. `moment` → `date-fns`) with tests | AST transformation |

## Primary sources

- [ESLint: Custom Rules](https://eslint.org/docs/latest/extend/custom-rules)
- [ESTree spec](https://github.com/estree/estree)
- [Prettier: Rationale](https://prettier.io/docs/rationale)

## Related toolkit

- [`@chalidade/eslint-config`](/en/toolkit/eslint-config): a shared flat config (JS + TS, optional React Hooks and type-aware rules, Prettier-safe)
