# Toolkit

Toolkit adalah package npm kecil yang lahir dari materi roadmap. Setiap package punya dua tujuan:

1. **Dipakai** di project nyata: kecil, tanpa dependensi, dengan type TypeScript yang lengkap.
2. **Dipelajari**: source-nya sengaja ditulis pendek dan mudah dibaca, dan setiap fungsi
   terhubung ke tahap roadmap yang menjelaskan konsepnya.

## Daftar package

| Package | Isi | Status |
| --- | --- | --- |
| [`@chalidade/utils`](/toolkit/utils) | `debounce`, `throttle`, `cx`, `clamp` | ✅ siap, belum dipublish ke npm |
| [`@chalidade/tokens`](/toolkit/tokens) | Design tokens (warna, spacing, tipografi) sebagai CSS variables + TS | ✅ siap, belum dipublish ke npm |
| [`@chalidade/react-hooks`](/toolkit/react-hooks) | `useDebouncedValue`, `useMediaQuery`, `useLocalStorage`, `useIntersectionObserver`, … | ✅ siap, belum dipublish ke npm |
| [`@chalidade/fetch`](/toolkit/fetch) | `fetchWithRetry`: timeout, retry dengan backoff + jitter, `Retry-After` | ✅ siap, belum dipublish ke npm |
| `@chalidade/ui` | Komponen aksesibel (Button, Dialog, Tabs, Combobox, …) | 🗓️ rencana |

## Prinsip

- **Tanpa dependensi runtime** sebisa mungkin.
- **Tree-shakeable**: ESM + `sideEffects: false`.
- **Teruji**: setiap fungsi punya test (Vitest).
- **Aksesibel**: komponen UI mengikuti [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/).

## Mengembangkan secara lokal

```bash
git clone https://github.com/chalidade/front-end-training
cd fet
pnpm install
pnpm test        # jalankan semua test
pnpm build       # build ESM + CJS + .d.ts
pnpm docs:dev    # jalankan situs dokumentasi ini secara lokal
```
