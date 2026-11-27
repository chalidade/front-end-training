# @chalidade/eslint-config

Konfigurasi ESLint (flat config) bersama untuk project JavaScript dan TypeScript: preset
`recommended` dari ESLint dan typescript-eslint, aturan React Hooks yang bisa dinyalakan, type-aware
linting yang bisa dinyalakan, dan `eslint-config-prettier` di urutan terakhir supaya tidak bentrok
dengan Prettier.

```bash
pnpm add -D eslint typescript @chalidade/eslint-config
# atau
npm install -D eslint typescript @chalidade/eslint-config
```

::: warning Belum dipublish
Package ini belum dipublish ke npm. Sementara ini, salin source-nya dari
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/eslint-config/src).
:::

## Pemakaian

```js
// eslint.config.js
import { chalidade } from "@chalidade/eslint-config";

export default chalidade({ react: true });
```

Hasilnya array flat config biasa, jadi bisa ditambah atau ditimpa:

```js
export default [
  ...chalidade({ react: true, typeChecked: { tsconfigRootDir: import.meta.dirname } }),
  { files: ["scripts/**"], rules: { "no-console": "off" } },
];
```

| Opsi | Default | Arti |
| --- | --- | --- |
| `react` | `false` | aturan `eslint-plugin-react-hooks` (rules-of-hooks, exhaustive-deps, dan aturan React Compiler) |
| `typeChecked` | `false` | `{ tsconfigRootDir }` untuk menyalakan aturan yang butuh informasi tipe |
| `env` | `["browser", "node"]` | global yang dikenal (`window`, `process`, …) |
| `ignores` | `[]` | pola tambahan; `dist`, `build`, `coverage`, dan `.vitepress/cache` selalu diabaikan |

## Isinya

Urutan config penting, karena di flat config config yang belakangan menimpa yang lebih dulu:

1. **Ignores**: folder hasil build.
2. **`@eslint/js` recommended** dan **typescript-eslint** `recommended` (atau `recommendedTypeChecked`).
3. **Aturan tambahan** (`extraRules`), sedikit dan semuanya soal bug atau keterbacaan:
   - `eqeqeq: smart`: `===` di mana-mana, kecuali `x == null` yang sengaja menangkap `null` dan `undefined`.
   - `no-console` (warn): `console.warn` dan `console.error` tetap boleh.
   - `prefer-const`, `no-var`.
   - `consistent-type-imports`: `import { type Foo }` terhapus saat build, jadi modul yang hanya
     diimpor untuk tipenya tidak ikut termuat.
   - `no-unused-vars` dengan prefix `_` untuk parameter yang sengaja tidak dipakai.
4. **React Hooks** kalau `react: true`.
5. **`eslint-config-prettier`** paling akhir: mematikan semua aturan formatting yang bisa bentrok
   dengan Prettier. Formatting adalah urusan Prettier, bukan linter (lihat
   [10 Linters & Formatters](/roadmap/10-linters-formatters)).

Dengan `typeChecked`, file `.js/.mjs/.cjs` otomatis memakai `disableTypeChecked`, karena file
seperti `eslint.config.js` biasanya tidak termasuk di `tsconfig.json`.

## Eksperimen: menjalankannya di repo ini sendiri

Config ini dijalankan ke 50 file TypeScript di `packages/*/src` repo ini, sekali tanpa dan sekali
dengan type-aware linting.

```text
mode         waktu     temuan
default      1,5 dtk   react-hooks/exhaustive-deps ×3, react-hooks/refs ×1, react-hooks/purity ×1
typeChecked  5,6 dtk   semua di atas, plus no-unnecessary-type-assertion ×6, no-floating-promises ×3,
                       no-unsafe-assignment ×2, unbound-method ×2, require-await ×1,
                       prefer-promise-reject-errors ×1
```

Yang menarik bukan jumlahnya, tapi jenisnya:

- **Type-aware linting hampir 4× lebih lambat**, karena ESLint harus menjalankan compiler
  TypeScript. Sebagai gantinya ia menemukan hal yang tidak terlihat dari sintaks saja, misalnya
  tiga promise di test yang tidak di-`await` (`no-floating-promises`).
- **Tiga temuan `exhaustive-deps` disengaja.** Misalnya `useLocalStorage` sengaja hanya bergantung
  pada `raw`, dan sudah diberi komentar. Linter tidak membaca komentar, jadi keputusan seperti ini
  sebaiknya ditulis dengan `// eslint-disable-next-line` beserta alasannya.
- **`react-hooks/refs` di `usePrevious` benar.** Membaca `ref.current` saat render tidak cocok
  dengan React Compiler, dan dokumentasi React memang tidak menyarankannya.
- **`react-hooks/purity` di `useThrottledCallback` kemungkinan salah sasaran.** `Date.now()`
  berada di fungsi yang dibuat di dalam `useMemo` tapi baru dipanggil saat event, bukan saat
  render. Linter adalah heuristik: baca alasannya sebelum mengubah kode.

## Yang sengaja tidak ada

- **Aturan gaya** (indentasi, titik koma, urutan import). Prettier yang mengurus, dan perdebatan
  gaya di code review adalah alasan formatter dibuat.
- **Plugin React lengkap, jsx-a11y, dan import.** Masing-masing bagus, tapi menambah dependensi
  dan waktu lint. Tambahkan sendiri di array hasil `chalidade()` kalau project-mu butuh.
- **Preset `strict`.** Bagus untuk library, terlalu berisik untuk aplikasi yang baru mulai.

## Konsep terkait

[10 Linters & Formatters](/roadmap/10-linters-formatters) (AST, custom rule, codemod),
[07 Framework](/roadmap/07-framework) (aturan Hooks), dan
[`@chalidade/react-hooks`](/toolkit/react-hooks) (tempat eksperimen di atas dijalankan).

## Belajar dari source-nya

Latihan yang disarankan: baca
[`index.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/eslint-config/src/index.ts),
lalu jawab sebelum melihat test-nya. Apa yang terjadi kalau `eslint-config-prettier` dipindah ke
urutan pertama? Kenapa `eqeqeq` memakai `"smart"`, bukan `"always"`? Tulis satu custom rule yang
melarang `fetch` tanpa timeout, lalu pasang di array hasil `chalidade()`.
