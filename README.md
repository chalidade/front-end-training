# fet: Front-End Training

📖 **Dokumentasi / Documentation: [chalidade.github.io/front-end-training](https://chalidade.github.io/front-end-training/)** (Bahasa Indonesia · [English](https://chalidade.github.io/front-end-training/en/))

[![Video launch fet: belajar front-end sampai paham cara kerjanya](docs/public/fet-launch-poster.jpg)](https://chalidade.github.io/front-end-training/fet-launch.mp4)

🎬 **[Tonton video launch (33 detik)](https://chalidade.github.io/front-end-training/fet-launch.mp4)**: dari roadmap, Ruang Belajar,
uji pemahaman, sampai Bukti Belajar.

Tempat untuk **deep dive front-end**: roadmap yang lengkap, cara belajar tiap tahapnya,
dan toolkit yang bisa langsung di-install di project.

Repo ini tidak berhenti di "apa yang perlu dipelajari". Tiap topik menjawab empat hal:

1. **Kenapa** topik ini penting dan masalah apa yang diselesaikannya.
2. **Bagaimana** cara mempelajarinya, berurutan, dengan latihan yang terukur.
3. **Seberapa paham**: pertanyaan uji yang tidak bisa dijawab hanya dengan hafalan.
4. **Bangun dari nol**: membuat ulang alatnya (mini React, mini bundler, dll.) sampai paham isinya.

## Peta repo

```
fet/
├── docs/               # situs dokumentasi (VitePress); docs/en = versi English
│   ├── roadmap/        # 20 tahap dalam 8 fase, mulai dari sini
│   ├── deep-dives/     # topik yang lebih dalam dari roadmap (browser internals, dll.)
│   ├── notes/          # catatan eksperimen & pengukuran pribadi
│   ├── templates/      # template untuk menulis topik baru
│   ├── toolkit/        # dokumentasi package
│   └── how-to-learn.md # metode belajar yang dipakai di seluruh repo
├── supabase/           # skema database & panduan setup platform komunitas
└── packages/           # toolkit yang bisa di-install (npm)
    └── utils/          # @chalidade/utils: debounce, throttle, cx, clamp
```

## Mulai dari mana?

- **Baru mulai / ingin mengisi celah:** baca [metode belajar](docs/how-to-learn.md), lalu [peta roadmap](docs/roadmap/index.md).
- **Sudah berpengalaman:** loncat ke bagian *Uji pemahaman* di setiap tahap. Topik yang
  pertanyaannya tidak bisa kamu jawab dengan yakin adalah tempat untuk deep dive.
- **Butuh toolkit:** lihat [`packages/`](packages).

## Ruang Belajar & Komunitas

Setiap tahap roadmap punya **Ruang Belajar**: editor kode dengan preview, catatan, perekam video
penjelasan (disimpan ke Google Drive milik user), dan tombol untuk membagikan hasilnya ke
**Komunitas**. Login dengan GitHub/Google, data disimpan di Supabase. Panduan setup ada di
[`supabase/README.md`](supabase/README.md).

Halaman **Bukti Belajar** (`/bukti-belajar?u=<username>`) merangkum tahap yang selesai, konsep yang
dikuasai, dan hasil yang dipublikasikan dalam satu halaman yang bisa dibagikan atau dicetak ke PDF.

## Toolkit (packages)

| Package | Isi | Status |
| --- | --- | --- |
| [`@chalidade/utils`](packages/utils) | `debounce`, `throttle`, `cx`, `clamp` | ✅ siap, belum dipublish |
| [`@chalidade/tokens`](packages/tokens) | Design tokens (warna, spacing, tipografi, motion) sebagai CSS variables + TS, dengan mode gelap | ✅ siap, belum dipublish |
| [`@chalidade/react-hooks`](packages/react-hooks) | `useDebouncedValue`, `useThrottledCallback`, `useMediaQuery`, `useLocalStorage`, `useOnline`, … | ✅ siap, belum dipublish |
| [`@chalidade/fetch`](packages/fetch) | `fetchWithRetry`: timeout, retry dengan backoff + jitter, `Retry-After` | ✅ siap, belum dipublish |
| [`@chalidade/learn-theme`](packages/learn-theme) | Tema VitePress untuk situs belajar: Ruang Belajar, komunitas, Bukti Belajar | ✅ dipakai situs ini, belum dipublish |
| `@chalidade/ui` | Komponen aksesibel (Button, Dialog, Tabs, Combobox, …) | 🗓️ rencana |

> Semua package dipublish di bawah scope npm `@chalidade/*`. Belum ada yang dipublish ke npm.

## Pengembangan

```bash
pnpm install
pnpm test        # vitest di semua package
pnpm typecheck
pnpm build       # tsup → ESM + CJS + .d.ts
pnpm changeset   # catat perubahan sebelum rilis
pnpm docs:dev    # jalankan situs dokumentasi di http://localhost:5173/front-end-training/
```

Referensi awal roadmap: [roadmap.sh/frontend](https://roadmap.sh/frontend). Struktur dan isinya
diperluas dengan lapisan deep dive, latihan, dan sumber primer (spesifikasi WHATWG, ECMA-262, CSSWG).

## Lisensi

MIT © Chalid Ade Rahman
