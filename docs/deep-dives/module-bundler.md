# Deep Dive: Module Bundler dari Nol

> Terkait: [09 Build Tools](../roadmap/09-build-tools.md). Deep dive lain:
> [HTTP Caching](http-caching.md), [Cara kerja V8](v8.md)

## Pertanyaan pembuka

Browser modern sudah mengerti `import`. Lalu kenapa kita masih butuh Webpack, Rollup, esbuild, atau
Vite saat build? Apa sebenarnya isi file `dist/assets/index-3f9a1c.js` itu? Kenapa sebuah fungsi
yang tidak pernah kamu pakai bisa hilang dari bundle, tapi `import "./polyfill.js"` tidak? Dan
kenapa import melingkar kadang menghasilkan `undefined`, kadang `ReferenceError`?

## Model mental

Bundler adalah **compiler untuk graf modul**. Ia bekerja dalam empat langkah:

```
 entry: src/main.js
    │
    ▼  1. parse      baca file, ubah ke AST, cari import/export
    ▼  2. resolve    "./math.js" → /abs/path/src/math.js (node_modules, alias, ekstensi)
    ▼  3. graph      ulangi 1–2 untuk setiap dependency sampai tidak ada file baru
    │
    │      main.js ──► math.js
    │         └─────► greet.js ──► math.js   (math.js hanya dimuat sekali)
    │
    ▼  4. generate   gabungkan modul jadi satu atau beberapa chunk + runtime kecil
 dist/index-[hash].js
```

Di antara langkah 3 dan 4 terjadi hal-hal yang membuat bundler berharga: **transform** (TypeScript,
JSX, CSS), **tree shaking**, **scope hoisting**, **code splitting**, **minify**, dan **hashing**
nama file.

Kenapa tidak langsung kirim ratusan file ESM ke browser? Setiap `import` adalah request yang baru
ketahuan setelah file induknya selesai diunduh dan di-parse. Graf sedalam 10 level berarti 10
putaran network berurutan (*waterfall*). Bundler meratakan graf itu di waktu build.

## Mekanisme detail

### 1. Mini bundler dalam ±60 baris

Ini bundler yang benar-benar jalan, memakai parser [acorn](https://github.com/acornjs/acorn).
Langkah pertama: satu file menjadi satu objek modul.

```js
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "acorn";

let nextId = 0;
function createModule(file) {
  const code = readFileSync(file, "utf8");
  const ast = parse(code, { sourceType: "module", ecmaVersion: "latest" });
  const deps = [], edits = [], exportsOut = [];
  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      deps.push(node.source.value);
      const parts = node.specifiers.map((s) =>
        s.type === "ImportDefaultSpecifier" ? `default: ${s.local.name}` : `${s.imported.name}: ${s.local.name}`);
      edits.push([node.start, node.end,
        `const { ${parts.join(", ")} } = __require(${JSON.stringify(node.source.value)});`]);
    } else if (node.type === "ExportNamedDeclaration" && node.declaration) {
      edits.push([node.start, node.declaration.start, ""]); // buang kata "export"
      const d = node.declaration;
      const names = d.id ? [d.id.name] : d.declarations.map((x) => x.id.name);
      exportsOut.push(...names.map((n) => `exports.${n} = ${n};`));
    } else if (node.type === "ExportDefaultDeclaration") {
      edits.push([node.start, node.declaration.start, "exports.default = "]);
    }
  }
  let out = code;
  for (const [s, e, text] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + text + out.slice(e);
  return { id: nextId++, file, deps, code: out + "\n" + exportsOut.join("\n"), map: {} };
}
```

Kuncinya: bundler **tidak** mencari `import` dengan regex. Ia membaca AST, jadi string atau komentar
yang berisi kata `import` tidak mengecoh.

Langkah kedua: telusuri graf secara breadth-first dan beri setiap file satu id.

```js
function createGraph(entry) {
  const queue = [createModule(resolve(entry))];
  const byFile = new Map([[queue[0].file, queue[0]]]);
  for (const mod of queue) {
    for (const rel of mod.deps) {
      const abs = resolve(dirname(mod.file), rel);         // resolver paling sederhana
      if (!byFile.has(abs)) { const c = createModule(abs); byFile.set(abs, c); queue.push(c); }
      mod.map[rel] = byFile.get(abs).id;                    // "./math.js" → 1
    }
  }
  return queue;
}
```

Langkah ketiga: bungkus setiap modul dalam fungsi, lalu tambahkan runtime kecil dengan cache.

```js
function bundle(graph) {
  const modules = graph.map((m) =>
    `${m.id}: [function (__require, exports) {\n${m.code}\n}, ${JSON.stringify(m.map)}]`).join(",\n");
  return `(function (modules) {
  const cache = {};
  function load(id) {
    if (cache[id]) return cache[id].exports;
    const [fn, map] = modules[id];
    const module = (cache[id] = { exports: {} });
    fn((rel) => load(map[rel]), module.exports);
    return module.exports;
  }
  load(0);
})({\n${modules}\n});`;
}
```

Untuk `main.js → math.js, greet.js` dan `greet.js → math.js`, grafnya:

```
0 main.js -> {"./math.js":1,"./greet.js":2} | 1 math.js -> {} | 2 greet.js -> {"./math.js":1}
```

Hasilnya satu file 841 byte yang mencetak `hi fet #2 5`. `math.js` hanya dijalankan sekali karena
`cache`. Bentuk ini (objek modul + fungsi `__webpack_require__`) adalah inti runtime Webpack.

### 2. Import melingkar: kenapa `cache` diisi sebelum modul jalan

Perhatikan urutan di `load`: `cache[id]` diisi **sebelum** `fn(...)` dipanggil. Tanpa itu, `a.js →
b.js → a.js` akan berputar selamanya. Akibatnya, saat `b.js` meminta `a.js`, ia mendapat objek
`exports` milik `a.js` yang **belum selesai diisi**:

```js
// a.js                                // b.js
import { b } from "./b.js";            import { a } from "./a.js";
export const a = "A";                  export const b = "B";
console.log("a sees", b);              console.log("b sees", typeof a === "undefined" ? "undefined" : a);
```

| Dijalankan dengan | Hasil |
| --- | --- |
| Mini bundler (gaya CommonJS) | `b sees undefined`, lalu `a sees B` |
| ESM asli di Node | `ReferenceError: Cannot access 'a' before initialization` |

ESM asli memakai **live binding**: `a` di `b.js` adalah binding yang sama dengan `a` di `a.js`, dan
masih berada di *temporal dead zone*. Bahkan `typeof a` ikut melempar error. Mini bundler menyalin
nilai lewat destructuring, jadi ia hanya melihat `undefined`. Rollup dan esbuild menjaga semantik
ESM, bukan semantik CommonJS seperti ini.

### 3. Scope hoisting

Membungkus setiap modul dalam fungsi ada biayanya: satu closure per modul, akses lewat objek
`exports`, dan minifier tidak bisa mengganti nama di antara modul. Rollup dan esbuild memakai
**scope hoisting**: semua modul ditaruh di satu scope, lalu nama yang bentrok di-rename. Ini output
esbuild untuk contoh yang sama:

```js
(() => {
  // src/math.js
  function add(a, b) {
    return a + b;
  }

  // src/greet.js
  function greet(name) {
    return `hi ${name} #${add(1, 1)}`;
  }

  // src/main.js
  console.log(greet("fet"), add(2, 3));
})();
```

Tidak ada runtime, tidak ada `require`. Perhatikan juga `mul` dari `math.js` hilang.

### 4. Tree shaking dan `sideEffects`

Karena `import`/`export` ESM statis (tidak bisa ditulis di dalam `if`, namanya harus literal),
bundler bisa tahu di waktu build export mana yang dipakai. Export yang tidak pernah dirujuk dibuang.
Ini yang membuat `mul` hilang.

Tapi bundler harus berhati-hati dengan kode top-level yang punya efek samping:

```js
// side.js
export const unused = 1;
window.__tracked = true;   // efek samping

// main2.js
import { add } from "./math.js";
import "./side.js";
console.log(add(2, 3));
```

Output Rollup (default) tetap menyertakan `window.__tracked = true;`, karena bundler tidak bisa
membuktikan baris itu aman dibuang. Dengan `treeshake.moduleSideEffects: false` (setara dengan
`"sideEffects": false` di `package.json` untuk Webpack), baris itu ikut hilang. Inilah arti
`sideEffects`: sebuah **janji** dari penulis package bahwa modul yang tidak dipakai export-nya
boleh dibuang seluruhnya. Kalau janjinya salah (misalnya file CSS atau polyfill), fiturnya hilang
diam-diam. Karena itu biasanya ditulis `"sideEffects": ["*.css"]`.

CommonJS (`require` di mana saja, `module.exports[nama] = …`) sulit di-tree-shake karena bentuknya
baru diketahui saat runtime. Itulah alasan library modern mengirim build ESM.

### 5. Code splitting dan hashing

`import("./chart.js")` (dynamic import) memberi tahu bundler: "ini titik pisah". Bundler membuat
chunk baru untuk subgraf `chart.js`, dan modul yang dipakai bersama oleh beberapa chunk dipindah ke
chunk bersama supaya tidak terduplikasi.

Setiap chunk diberi nama berdasarkan **hash isinya** (`index-3f9a1c.js`). Kalau isinya tidak berubah,
namanya tidak berubah, jadi browser boleh menyimpannya selamanya
(`Cache-Control: max-age=31536000, immutable`, lihat [HTTP Caching](http-caching.md)). Hanya
`index.html` yang harus selalu divalidasi ulang.

### 6. Dev server vs build

| | Dev (Vite) | Build (Rollup/Rolldown, esbuild, Webpack) |
| --- | --- | --- |
| Bundling | Tidak untuk kode sendiri: browser mengambil ESM per file | Ya, graf diratakan jadi chunk |
| Dependency | Di-*pre-bundle* sekali dengan esbuild (banyak file → satu) | Ikut dibundel |
| Transform | Per request, hanya file yang dibuka | Semua file sekali jalan |
| Perubahan file | HMR: hanya modul itu dan *boundary*-nya diganti | Build ulang |

Vite cepat di dev karena **tidak** melakukan langkah 3–4 sama sekali. Untuk produksi, waterfall
request dan ukuran file kembali penting, jadi tetap dibundel.

## Eksperimen

Semua hasil di bawah diverifikasi dengan Node 22, `acorn@8.19.0`, `rollup@4.65.0`, dan
`esbuild@0.27.7`.

1. **Mini bundler.** Salin tiga potongan kode di bagian 1 ke `bundle.mjs`, buat `main.js`,
   `math.js`, dan `greet.js`, lalu jalankan `node bundle.mjs src/main.js > out.js && node out.js`.
   Tambahkan `console.log` di `math.js` dan buktikan ia hanya jalan sekali.
2. **Import melingkar.** Jalankan contoh `a.js`/`b.js` dengan mini bundler-mu, lalu sebagai `.mjs`
   langsung di Node. Ganti `export const a` menjadi `export function a() {}` dan ulangi. Kenapa
   hasil ESM-nya berubah? (Petunjuk: hoisting deklarasi fungsi.)
3. **Bandingkan output.** Bundle contoh yang sama dengan
   `npx esbuild src/main.js --bundle --format=iife` dan dengan Rollup. Cari di mana `mul` pergi.
4. **`sideEffects`.** Ulangi contoh `side.js` dengan Rollup, sekali dengan default dan sekali dengan
   `treeshake: { moduleSideEffects: false }`. Lalu buat package lokal dengan
   `"sideEffects": false` yang mengimpor file CSS dan lihat CSS-nya hilang.
5. **Code splitting.** Tambahkan `import("./chart.js")` di dalam handler klik. Build dengan Vite dan
   buka panel Network: kapan chunk `chart-[hash].js` diunduh?
6. **Analisis bundle.** Jalankan `esbuild --bundle --metafile=meta.json` pada proyek nyata, lalu
   buka `meta.json` di [esbuild bundle analyzer](https://esbuild.github.io/analyze/). Temukan satu
   dependency yang ukurannya mengejutkan.

Catat hasil dan kejutannya di [catatan eksperimen](/notes/). Eksperimen 1 adalah titik awal proyek
latihan "Mini bundler" di tahap 09. Tantangan berikutnya: dukung `export { x } from`, resolusi
`node_modules`, dan scope hoisting sederhana.

## Implikasi praktis

- **Tulis dan konsumsi ESM.** Hanya import/export statis yang bisa di-tree-shake dengan andal.
  Hindari `import * as lib` lalu mengakses properti secara dinamis.
- **Deklarasikan `sideEffects` dengan jujur** di package-mu, termasuk file CSS dan polyfill.
- **Hindari import melingkar.** Kalau terpaksa, jangan membaca nilai dari modul lain di top-level;
  bungkus dalam fungsi yang dipanggil belakangan.
- **Barrel file (`index.ts` yang me-re-export semuanya) ada harganya.** Bundler harus mem-parse
  semua modul di dalamnya, dan efek samping di salah satunya bisa menahan seluruh modul.
- **Pakai dynamic `import()` di batas rute dan fitur berat**, bukan di setiap komponen kecil.
  Terlalu banyak chunk kecil juga menambah request.
- **Ukur, jangan menebak:** lihat ukuran chunk di output build, pakai analyzer, dan pantau ukuran
  bundle di CI.

## Sumber primer

- [ECMAScript: Modules](https://tc39.es/ecma262/#sec-modules) (cyclic module records, live bindings)
- [Rollup: Tree-shaking](https://rollupjs.org/introduction/#tree-shaking) dan
  [`treeshake` options](https://rollupjs.org/configuration-options/#treeshake)
- [esbuild: Architecture](https://github.com/evanw/esbuild/blob/main/docs/architecture.md)
- [webpack: Tree Shaking & `sideEffects`](https://webpack.js.org/guides/tree-shaking/)
- [Vite: Why Vite](https://vite.dev/guide/why) dan
  [Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling)
- [acorn](https://github.com/acornjs/acorn) dan [ESTree spec](https://github.com/estree/estree)
- Ronen Amiel, [*minipack*](https://github.com/ronami/minipack): bundler mini dengan komentar lengkap
- Lin Clark, [*ES modules: A cartoon deep-dive*](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)
