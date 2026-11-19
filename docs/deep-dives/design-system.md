# Deep Dive: Design System, Tokens, Governance, Versioning

> Terkait: [08 CSS Architecture](../roadmap/08-css-architecture.md). Deep dive lain:
> [CSS Cascade & Specificity](css-cascade.md), [Accessibility tree](accessibility-tree.md)

## Pertanyaan pembuka

Tim desain mengganti warna utama dari indigo ke biru. Berapa file yang harus kamu ubah? Kalau
jawabannya "cari semua `#4f46e5` lalu ganti", design system-mu belum bekerja. Lalu ada pertanyaan
yang lebih sulit: kalau sebuah token dihapus, apakah itu breaking change? Siapa yang boleh menambah
komponen baru ke library bersama? Dan bagaimana kamu tahu tema gelap masih lolos kontras setelah
seseorang mengubah satu warna?

## Model mental

Design system bukan kumpulan komponen. Ia adalah **produk internal** dengan tiga lapis:

```
 ┌──────────────────────────────────────────────────────────────┐
 │ Governance   siapa memutuskan, cara kontribusi, versi, rilis │
 ├──────────────────────────────────────────────────────────────┤
 │ Komponen     Button, Dialog, Tabs: perilaku + aksesibilitas  │
 ├──────────────────────────────────────────────────────────────┤
 │ Tokens       keputusan desain sebagai data (warna, jarak...) │
 └──────────────────────────────────────────────────────────────┘
```

Token sendiri biasanya punya tiga tingkat. Setiap tingkat hanya boleh menunjuk ke tingkat di
bawahnya:

```
 component     button.bg ─────────┐
                                  ▼
 semantic      theme.primary ─────┐        (light)   theme.primary ──┐ (dark)
                                  ▼                                  ▼
 primitive     color.indigo.600 = #4f46e5            color.indigo.500 = #6366f1
```

- **Primitive** menjawab "nilai apa saja yang tersedia?". Namanya netral: `indigo.600`, `space.4`.
- **Semantic** menjawab "untuk apa nilai ini dipakai?": `primary`, `fgMuted`, `danger`. Mode
  gelap dan rebranding terjadi di lapis ini.
- **Component** menjawab "bagian mana dari komponen ini?": `button.bg`, `input.borderFocus`.
  Opsional; berguna saat satu komponen perlu menyimpang tanpa mengubah semantic.

Aturan praktisnya: **komponen hanya membaca semantic atau component token, tidak pernah
primitive.** Begitu ada `color: var(--fet-color-indigo-600)` di dalam komponen, rebranding kembali
menjadi pekerjaan cari-dan-ganti.

## Mekanisme detail

### 1. Token adalah data, CSS hanyalah salah satu output

Paket [`@chalidade/tokens`](../toolkit/tokens.md) di repo ini menyimpan token sebagai objek
TypeScript, lalu `flatten()` mengubahnya menjadi CSS variables:

```ts
// packages/tokens/src/tokens.ts (ringkas)
export const color = { indigo: { 400: "#818cf8", 600: "#4f46e5" }, white: "#ffffff", slate: { 950: "#020617" } };
export const theme = {
  light: { primary: color.indigo[600], onPrimary: color.white },
  dark: { primary: color.indigo[400], onPrimary: color.slate[950] },
};
```

```css
/* dist/tokens.css (ringkas) */
:root { --fet-color-indigo-600: #4f46e5; --fet-theme-primary: #4f46e5; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --fet-theme-primary: #818cf8; }
}
[data-theme="dark"] { --fet-theme-primary: #818cf8; }
```

Satu sumber bisa menghasilkan banyak output: CSS variables untuk web, konstanta TypeScript,
resource Android, Swift untuk iOS, variabel Figma. Inilah yang dikerjakan alat seperti
[Style Dictionary](https://styledictionary.com/). Karena itu formatnya penting: **Design Tokens
Community Group (DTCG)** menstandarkan file JSON dengan `$value`, `$type`, dan alias berbentuk
`"{color.indigo.600}"`, sehingga alat desain dan alat build bisa bertukar token tanpa konversi
manual.

### 2. Alias, resolusi, dan dua kesalahan yang paling sering

Dengan alias, tingkat semantic dan component tidak menyimpan nilai, hanya **rujukan**. Resolver
mengikuti rujukan sampai bertemu nilai mentah. Ada dua cara gagal: rujukan ke token yang tidak ada
(salah ketik), dan rujukan melingkar. Resolver yang baik menolak keduanya saat build, bukan
diam-diam menghasilkan CSS yang rusak. Kodenya ada di Eksperimen 2.

Token semantic di `@chalidade/tokens` memakai referensi objek TypeScript
(`primary: color.indigo[600]`), jadi salah ketik langsung jadi error tipe. Itu versi alias yang
dicek oleh compiler.

### 3. Theming adalah mengganti lapis semantic

Mode gelap tidak menambah token baru. Ia memberi **nilai lain untuk kunci semantic yang sama**.
Karena kuncinya sama (`ThemeToken` di paket ini adalah `keyof theme.light`), komponen tidak tahu dan
tidak perlu tahu mode apa yang aktif. CSS variables membuat pergantian ini murah: browser hanya
menghitung ulang nilai variabel yang diwarisi, tanpa memuat stylesheet baru.

Konsekuensinya, setiap pasangan warna semantic (`fg` di atas `bg`, `onPrimary` di atas `primary`)
harus lolos kontras **di setiap mode**. Pemeriksaan ini mudah diotomatiskan, dan Eksperimen 1
menunjukkan kenapa perlu.

### 4. Versioning: token adalah API publik

Begitu paket token dipakai aplikasi lain, nama token adalah **kontrak**. Dengan
[Semantic Versioning](https://semver.org/):

| Perubahan | Contoh | Dampak ke konsumen | Bump |
| --- | --- | --- | --- |
| Hapus atau rename token | `zIndex.dropdown` → `zIndex.popover` | `var(--fet-z-index-dropdown)` jadi kosong tanpa error | **major** |
| Tambah token | `theme.info` | tidak ada | minor |
| Ubah nilai token | `dark.primary` `#6366f1` → `#4f46e5` | tampilan berubah, kode tetap jalan | patch atau minor |

Baris pertama paling berbahaya karena **CSS tidak memberi error**. Variabel yang tidak terdefinisi
membuat properti jatuh ke nilai awalnya (`background: var(--hilang)` menjadi transparan). Karena itu
rename yang aman dilakukan bertahap: tambah nama baru, pertahankan nama lama sebagai alias yang
ditandai *deprecated* (format DTCG punya properti `$deprecated` untuk ini), lalu hapus di rilis
major berikutnya.

Ubah nilai adalah wilayah abu-abu. Kodenya tidak rusak, tapi screenshot test semua konsumen bisa
merah. Pilih satu aturan dan tulis di panduan kontribusi; konsistensi lebih penting daripada
pilihannya. Repo ini memakai [changesets](https://github.com/changesets/changesets): setiap PR yang
mengubah paket menyertakan file `.changeset/*.md` berisi jenis bump dan catatan, dan changelog
dibuat dari situ.

### 5. Governance: siapa memutuskan apa

Nathan Curtis membagi model tim design system menjadi tiga:

| Model | Cara kerja | Kekuatan | Risiko |
| --- | --- | --- | --- |
| **Solitary** | satu tim produk membuat sistem untuk dirinya, lalu "dibagikan" | cepat dimulai | tim lain tidak merasa memiliki |
| **Centralized** | tim khusus membangun dan merawat sistem untuk semua tim | kualitas dan konsistensi | jadi bottleneck, jauh dari kebutuhan produk |
| **Federated** | perwakilan dari beberapa tim produk berkontribusi bersama | relevan dan berskala | butuh koordinasi dan aturan main yang jelas |

Apa pun modelnya, governance yang sehat menjawab pertanyaan berikut secara tertulis:

- **Kapan sesuatu masuk ke sistem?** Aturan umum: setelah pola yang sama muncul di dua atau tiga
  produk. Komponen yang baru dipakai sekali lebih baik tinggal di produk itu dulu.
- **Bagaimana cara berkontribusi?** Proposal, review desain dan aksesibilitas, implementasi,
  dokumentasi, rilis.
- **Bagaimana cara menyimpang?** Tim produk akan selalu butuh varian. Sediakan jalan keluar resmi
  (component token, slot, `className`) supaya penyimpangan tidak berupa fork diam-diam.
- **Bagaimana mengukur adopsi?** Misalnya persentase import dari paket sistem dibanding komponen
  lokal, atau jumlah warna hex mentah yang masih tersisa di kode produk.

### 6. Library ber-versi atau copy-paste?

Dua cara mendistribusikan komponen punya trade-off yang berlawanan:

- **Paket npm ber-versi** (Material UI, Mantine, `@chalidade/*`): perbaikan bug dan aksesibilitas
  sampai ke semua konsumen dengan satu upgrade. Harganya, kustomisasi dalam terbatas, dan upgrade
  major bisa berat.
- **Copy-paste** (shadcn/ui): kode menjadi milikmu, bebas diubah. Harganya, perbaikan dari upstream
  tidak datang sendiri, dan setiap salinan perlahan menyimpang.

Banyak tim menggabungkan keduanya: **token dan primitive perilaku** (focus trap, posisi popover,
ARIA) didistribusikan sebagai paket ber-versi karena sulit dibuat benar, sedangkan **tampilan
komponen** boleh disalin dan disesuaikan.

## Eksperimen

Jalankan dari root repo setelah `pnpm --filter @chalidade/tokens build`. Hasil di bawah adalah
output asli.

**1. Audit kontras semua pasangan semantic.** Rumus luminans relatif dan rasio kontras diambil dari
WCAG 2.x.

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

Dua temuan nyata dari token repo ini:

- `border` gagal di kedua mode. Itu wajar selama border hanya dekoratif. Kalau border menjadi
  satu-satunya penanda batas input, WCAG 1.4.11 meminta minimal 3:1, jadi input butuh token sendiri
  (misalnya `borderStrong`).
- **Teks putih di atas `primary` mode gelap hanya 4.47:1**, sedikit di bawah 4.5:1 untuk teks
  normal. Tombol berlabel kecil di mode gelap belum lolos AA. Mode terang lolos, jadi bug ini tidak
  akan terlihat oleh orang yang hanya mengecek satu mode. Inilah alasan audit kontras sebaiknya
  berjalan di CI untuk setiap mode.

::: tip Sudah diperbaiki
Output di atas berasal dari token sebelum perbaikan (commit `36576cb`). Sesudahnya, mode gelap
memakai `primary` indigo-400 dengan `onPrimary` slate-950 (6.76:1), dan `accent` mode terang naik
dari cyan-600 (3.68:1) ke cyan-700 (5.36:1). Audit ini sekarang berjalan sebagai test di
`packages/tokens/src/index.test.ts`, jadi CI menolak token yang turun di bawah AA. Kalau kamu
menjalankan eksperimen ini di main, hanya `border` yang masih `GAGAL`.
:::

**2. Resolver alias DTCG mini.** Tiga tingkat token, rebranding lewat satu baris, dan dua
kesalahan yang harus ditangkap saat build.

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
tokens.semantic.primary.$value = "{color.indigo.700}";   // rebrand: satu baris
console.log("setelah rebrand: button.bg =", resolve("button.bg").value);
tokens.semantic.primary.$value = "{button.bg}";           // salah: menunjuk ke atas
try { resolve("button.bg"); } catch (e) { console.log(e.message); }
tokens.button.fg.$value = "{semantic.onPrimery}";         // salah ketik
try { resolve("button.fg"); } catch (e) { console.log(e.message); }
```

```
button.bg = #4f46e5  via button.bg → semantic.primary → color.indigo.600
button.fg = #ffffff  via button.fg → semantic.onPrimary → color.white
setelah rebrand: button.bg = #4338ca
alias melingkar: button.bg → semantic.primary → button.bg
token tidak ada: semantic.onPrimery
```

Perhatikan alias melingkar terjadi karena semantic menunjuk ke component, melanggar aturan "hanya
menunjuk ke bawah". Linter token bisa menolak arah ini sebelum siklusnya terbentuk.

**3. Menentukan versi dari diff token.** Bandingkan dua versi token yang sudah diratakan, lalu
turunkan jenis bump dari tabel di bagian 4.

```js
import { flatten, theme, tokens } from "./packages/tokens/dist/index.js";

const before = flatten({ ...tokens, theme });
const next = structuredClone({ ...tokens, theme });
next.theme.dark.primary = "#4f46e5";                                   // ubah nilai
next.theme.light.info = "#0284c7"; next.theme.dark.info = "#38bdf8";   // tambah
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

Rename satu token sudah cukup membuat rilis menjadi major, walaupun 124 token lain aman. Coba
ulangi tanpa baris rename: hasilnya `minor`.

Perhatikan juga jebakan di perubahan nilainya. Indigo-600 tampak seperti perbaikan untuk temuan
kontras tadi (teks putih di atasnya 6.29:1), tapi `primary` juga dipakai sebagai warna teks di atas
`bg`, dan pasangan itu turun menjadi 3.21:1. Satu token yang dipakai untuk dua peran
(latar tombol dan warna teks) harus lolos di keduanya. Karena itu perbaikan yang benar mengubah
tiga token sekaligus (`primary`, `primaryHover`, `onPrimary`), dan test kontras menjaga semua
pasangannya.

Catat hasil dan kejutannya di [catatan eksperimen](/notes/). Eksperimen 1 sudah menjadi test di
`packages/tokens`. Tantangan berikutnya: jadikan Eksperimen 3 sebagai pemeriksaan CI yang menolak
rename token tanpa changeset major.

## Implikasi praktis

- **Mulai dari token semantic, bukan komponen.** Sepuluh token semantic yang dipakai konsisten
  lebih berharga daripada lima puluh komponen yang masing-masing memakai hex mentah.
- **Komponen tidak boleh membaca primitive.** Pasang aturan lint (misalnya Stylelint
  `declaration-property-value-disallowed-list` atau pemeriksaan nama variabel) untuk menegakkannya.
- **Uji kontras setiap mode di CI.** Bug kontras biasanya hanya muncul di mode yang jarang dibuka
  oleh pembuatnya.
- **Perlakukan nama token sebagai API.** Rename lewat deprecate, bukan hapus langsung, dan biarkan
  diff token yang menentukan bump versi.
- **Tulis governance sebelum dibutuhkan:** kriteria masuk, alur kontribusi, cara menyimpang, dan
  aturan versi. Tanpa itu, tim produk akan membuat fork sendiri.
- **Ukur adopsi.** Design system yang tidak dipakai hanyalah dokumentasi.

## Sumber primer

- [Design Tokens Community Group: Format](https://tr.designtokens.org/format/) (`$value`, `$type`,
  alias, `$deprecated`)
- [Style Dictionary](https://styledictionary.com/): satu sumber token, banyak platform
- [Material Design 3: Design tokens](https://m3.material.io/foundations/design-tokens/overview)
  (reference → system → component)
- [WCAG 2.2: 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG22/#contrast-minimum) dan
  [1.4.11 Non-text Contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast)
- [Semantic Versioning 2.0.0](https://semver.org/) dan
  [changesets](https://github.com/changesets/changesets)
- Nathan Curtis, [*Team Models for Scaling a Design System*](https://medium.com/eightshapes-llc/team-models-for-scaling-a-design-system-2cf9d03be6a0)
- Brad Frost, [*Atomic Design*](https://atomicdesign.bradfrost.com/)
