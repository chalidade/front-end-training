# @chalidade/eslint-config

Flat config ESLint bersama untuk JavaScript dan TypeScript.

```js
// eslint.config.js
import { chalidade } from "@chalidade/eslint-config";

export default chalidade({
  react: true, // rules-of-hooks, exhaustive-deps, aturan React Compiler
  typeChecked: { tsconfigRootDir: import.meta.dirname }, // opsional, lebih lambat
});
```

- `@eslint/js` + typescript-eslint `recommended` (atau `recommendedTypeChecked`).
- Aturan tambahan: `eqeqeq: smart`, `no-console` (warn/error boleh), `prefer-const`, `no-var`,
  `consistent-type-imports`, `no-unused-vars` dengan prefix `_`.
- `eslint-config-prettier` di urutan terakhir, jadi aman dipakai bersama Prettier.
- Butuh `eslint` ≥ 9.22 dan `typescript` sebagai peer dependency.

Dokumentasi lengkap: https://chalidade.github.io/front-end-training/toolkit/eslint-config
