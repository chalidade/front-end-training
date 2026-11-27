# 10 · Linters & Formatters

> **Fase:** 4 · **Estimasi:** 3 hari · **Prasyarat:** [09 Build Tools](09-build-tools.md)

## Kenapa ini penting

Linter dan formatter mengubah aturan tim dari diskusi di code review menjadi otomatis. Di balik
keduanya ada konsep yang sangat berguna: **AST (Abstract Syntax Tree)**, yang juga dipakai oleh
bundler, compiler, dan codemod.

## Peta konsep

### Dasar
- [ ] Prettier: formatter yang opinionated
- [ ] ESLint: flat config, rules, plugins (`typescript-eslint`, `eslint-plugin-react-hooks`, `jsx-a11y`)
- [ ] Integrasi editor dan pre-commit hook (lint-staged, husky / lefthook)

### Menengah
- [ ] Beda linting (kualitas/bug) vs formatting (gaya)
- [ ] Type-aware linting
- [ ] Alternatif cepat: Biome, oxlint
- [ ] Stylelint untuk CSS

### Deep dive
- [ ] AST: ESTree, visitor pattern
- [ ] Menulis custom ESLint rule
- [ ] Codemod dengan jscodeshift / ast-grep untuk migrasi skala besar

## Cara belajar

1. Tempel kode ke [AST Explorer](https://astexplorer.net/) dan telusuri bentuk tree-nya.
2. Tulis satu custom ESLint rule (misalnya melarang `console.log` kecuali di file tertentu).
3. Tulis codemod yang mengganti import lama ke import baru di seluruh repo.

## Uji pemahaman

1. Kenapa `eslint-plugin-react-hooks` bisa mendeteksi dependency yang hilang? Apa batasannya?
2. Kenapa menjalankan Prettier lewat ESLint (`eslint-plugin-prettier`) tidak disarankan lagi?
3. Bagaimana linter tahu sebuah variabel tidak dipakai? (scope analysis)

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Setup ESLint + Prettier + lint-staged di project | Tooling |
| Menengah | Custom rule ESLint untuk konvensi tim | AST, visitor |
| Deep | Codemod migrasi API (misal `moment` → `date-fns`) dengan test | Transformasi AST |

## Sumber primer

- [ESLint: Custom Rules](https://eslint.org/docs/latest/extend/custom-rules)
- [ESTree spec](https://github.com/estree/estree)
- [Prettier: Rationale](https://prettier.io/docs/rationale)

## Toolkit terkait

- [`@chalidade/eslint-config`](/toolkit/eslint-config): flat config bersama (JS + TS, React Hooks dan type-aware opsional, aman dengan Prettier)
