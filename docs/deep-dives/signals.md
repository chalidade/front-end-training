# Deep Dive: Signals, dari Knockout ke TC39 Proposal

> Terkait: [07 Framework](../roadmap/07-framework.md). Deep dive lain:
> [React Fiber dari source code](react-fiber.md), [Efisiensi di React](react-efficiency.md)

## Pertanyaan pembuka

Di React, mengubah satu state membuat komponennya dijalankan ulang, lalu React mencari bedanya.
Di Solid, Vue, Angular, Preact Signals, dan Svelte 5, mengubah satu nilai langsung memperbarui
satu node DOM yang memakainya, tanpa menjalankan ulang fungsi komponen. Bagaimana caranya library
tahu siapa yang memakai nilai itu, padahal kamu tidak pernah menulis daftar dependency? Kenapa
`computed` bisa tidak pernah dihitung sama sekali? Dan kenapa ide dari tahun 2010 ini sekarang
diusulkan masuk ke JavaScript sendiri?

## Model mental

Signal adalah **nilai yang tahu siapa pembacanya**. Ada tiga peran:

| Peran | Contoh API | Tugas |
| --- | --- | --- |
| **Sumber** (state) | `signal(0)`, `ref(0)`, `new Signal.State(0)` | Menyimpan nilai, memberi tahu pembaca saat berubah |
| **Turunan** (computed) | `computed(() => a.value * 2)` | Nilai yang dihitung dari signal lain, di-cache |
| **Efek** (effect) | `effect(() => el.textContent = …)` | Ujung graf: menyentuh dunia luar (DOM, network) |

Ketiganya membentuk **graf dependency** yang dibangun otomatis saat kode berjalan:

```
   firstName ─┐
              ├──► fullName (computed) ──► effect: render <h1>
   lastName ──┘                     ▲
                                    │ dibaca saat effect berjalan → tercatat sebagai dependency
```

Bandingkan dengan React. React tidak tahu bagian UI mana yang memakai sebuah state, jadi ia
menjalankan ulang komponen dan membandingkan hasilnya (lihat [React Fiber](react-fiber.md)).
Signals tahu persis, jadi tidak perlu membandingkan apa pun. Harganya: kamu harus membaca nilai
lewat getter (`.value`, `()`, `.get()`) supaya pembacaannya bisa dilacak.

## Mekanisme detail

### 1. Pelacakan otomatis: variabel global "siapa yang sedang berjalan"

Seluruh triknya adalah satu variabel global. Ini mini library lengkap yang bisa dijalankan:

```js
let current = null; // komputasi yang sedang berjalan

export function signal(value) {
  const subs = new Set();
  return {
    get value() {
      if (current) { subs.add(current); current.deps.add(subs); } // catat pembaca
      return value;
    },
    set value(v) {
      if (Object.is(v, value)) return;
      value = v;
      for (const s of [...subs]) s.notify(); // beri tahu pembaca
    },
  };
}

export function effect(fn) {
  const run = { deps: new Set(), notify: execute };
  function execute() {
    for (const d of run.deps) d.delete(run); // lepas dependency lama
    run.deps.clear();
    const prev = current; current = run;
    try { fn(); } finally { current = prev; }
  }
  execute();
  return () => { for (const d of run.deps) d.delete(run); };
}
```

Saat `effect` berjalan, `current` menunjuk ke dirinya. Setiap getter yang terpanggil mencatat
`current` sebagai pembaca. Saat setter dipanggil, semua pembaca dijalankan ulang.

Dependency dibangun ulang **setiap kali berjalan**, jadi dependency bisa dinamis:

```js
const first = signal("Ada"), last = signal("Lovelace"), showFull = signal(true);
effect(() => log(showFull.value ? `${first.value} ${last.value}` : first.value));
last.value = "Byron";    // jalan ulang: "Ada Byron"
showFull.value = false;  // jalan ulang: "Ada", dan last tidak dibaca lagi
last.value = "King";     // TIDAK jalan ulang
```

Ini juga alasan aturan di Solid: jangan destructure props. `const { name } = props` membaca nilai
sekali di luar effect, jadi tidak ada yang tercatat.

### 2. Masalah glitch dan "push-then-pull"

Implementasi yang paling naif membuat `computed` sebagai effect yang menulis ke signal lain dan
langsung menjalankan semua pembaca saat ada perubahan (*push* murni). Pada graf berbentuk berlian,
hasilnya salah:

```
        a
       ╱ ╲
  b = a*2   c = a*3
       ╲ ╱
     effect: b + c
```

Ubah `a` dari 1 ke 2, lalu catat setiap kali effect berjalan. Ini hasil nyata dari versi naif:

```
[ '2+3=5', '4+3=7', '4+6=10' ]
```

`4+3=7` adalah **glitch**: effect melihat `b` yang baru dan `c` yang lama, sebuah keadaan yang
tidak pernah benar. Kalau effect itu mengirim request atau menulis ke DOM, kesalahannya terlihat.

Library modern (Preact Signals, Solid, Vue 3.5+, Angular, dan TC39 proposal) memakai
**push-then-pull**:

1. **Push (murah):** saat sumber berubah, kabar "mungkin kotor" didorong ke seluruh turunan. Belum
   ada yang dihitung.
2. **Pull (malas):** nilai baru baru dihitung saat ada yang membacanya. Sebelum menghitung, sebuah
   computed mengecek apakah sumbernya benar-benar berubah (lewat nomor versi atau status
   clean/check/dirty).
3. **Effect dijadwalkan**, lalu dijalankan setelah seluruh graf ditandai. Saat effect membaca `b`
   dan `c`, keduanya ditarik dan dihitung ulang dengan `a` yang sama.

Dengan `@preact/signals-core`, graf berlian yang sama menghasilkan `[ '2+3=5', '4+6=10' ]`.

### 3. Tiga sifat yang lahir dari pull

- **Lazy:** computed yang tidak pernah dibaca tidak pernah dihitung. Setelah `count` diubah dua
  kali, `double` tetap belum dihitung (0 evaluasi). Dua kali membaca `double.value` hanya memicu
  1 evaluasi karena hasilnya di-cache.
- **Equality cut-off:** kalau computed menghasilkan nilai yang sama (`Object.is`), pembacanya tidak
  dijalankan ulang. `isOdd = computed(() => n.value % 2 === 1)`: mengubah `n` dari 1 ke 3 ke 5
  tidak menjalankan ulang effect yang hanya membaca `isOdd`.
- **Batch:** beberapa penulisan di dalam `batch(() => { x.value = 1; y.value = 2 })` menghasilkan
  satu kali effect berjalan, bukan dua.

### 4. Sejarah singkat

| Tahun | Library | Kontribusi |
| --- | --- | --- |
| 2010 | **Knockout.js** | `ko.observable` dan `ko.computed` dengan *dependency detection* otomatis. Ide dasarnya sudah ada di sini. |
| 2012–2015 | Meteor Tracker, **S.js**, **MobX** | Pelacakan otomatis untuk state aplikasi. S.js memperkenalkan pembaruan sinkron yang konsisten (tanpa glitch). |
| 2016–2020 | **Vue 2 → Vue 3** | Getter/setter di Vue 2, lalu `Proxy` dan `ref`/`computed`/`effect` di Vue 3 |
| 2018–2021 | **SolidJS** | `createSignal` + compiler JSX: komponen berjalan **sekali**, hanya effect kecil per node DOM yang berjalan ulang. Istilah "signals" mulai populer. |
| 2022–2024 | **Preact Signals**, **Angular signals** (v16), **Svelte 5 runes**, Qwik | Hampir semua framework selain React beralih ke signals |
| 2024 | **TC39 Signals proposal** | Masuk Stage 1 pada April 2024. Tujuannya satu inti graf reaktif yang bisa dipakai bersama oleh semua framework. |

### 5. TC39 proposal: inti, bukan framework

Proposal ini sengaja **tidak** menyediakan `effect`. Ia hanya menyediakan graf dan cara
mengamatinya, supaya setiap framework bisa memakai penjadwal sendiri:

```js
import { Signal } from "signal-polyfill";

const counter = new Signal.State(0);
const isEven = new Signal.Computed(() => (counter.get() & 1) === 0);
const parity = new Signal.Computed(() => (isEven.get() ? "even" : "odd"));

// effect buatan sendiri: Watcher + microtask
let pending = false;
const w = new Signal.subtle.Watcher(() => {
  if (pending) return;
  pending = true;
  queueMicrotask(() => {
    pending = false;
    for (const s of w.getPending()) s.get();
    w.watch(); // pasang ulang notifikasi
  });
});
function effect(cb) {
  const c = new Signal.Computed(cb);
  w.watch(c);
  c.get();
  return () => w.unwatch(c);
}
```

Callback `Watcher` dipanggil **sinkron** saat sumber ditandai kotor, dan di dalamnya kamu tidak
boleh membaca atau menulis signal. Tugasnya hanya menjadwalkan. Dengan `effect` di atas,
`counter.set(1); counter.set(2); counter.set(3)` secara sinkron hanya menghasilkan satu log
`parity: odd` di microtask berikutnya, dan `counter.set(5)` tidak menghasilkan log sama sekali
karena `parity` tetap `"odd"`.

`Signal.subtle` diberi nama begitu karena isinya untuk penulis framework, bukan untuk kode aplikasi
sehari-hari.

## Eksperimen

Semua hasil di bawah diverifikasi dengan Node 22, `@preact/signals-core@1.14.5`, dan
`signal-polyfill@0.2.2`.

1. **Mini signals.** Salin library di bagian 1 ke `mini.mjs` dan jalankan contoh `first`/`last`/
   `showFull`. Hasilnya harus `['Ada Lovelace', 'Ada Byron', 'Ada', 'Augusta']` setelah kamu
   menambahkan `first.value = "Augusta"` di akhir.
2. **Buat glitch.** Tambahkan `eagerComputed(fn)` yang membuat signal lalu effect yang menulis ke
   signal itu. Bangun graf berlian di bagian 2 dan buktikan munculnya `4+3=7`.
3. **Perbaiki glitch.** Jalankan graf yang sama dengan `@preact/signals-core`. Lalu coba perbaiki
   mini library-mu sendiri: tandai kotor dulu, jalankan effect setelah semua ditandai, dan hitung
   computed hanya saat dibaca.
4. **Lazy dan cut-off.** Hitung berapa kali sebuah `computed` dievaluasi kalau tidak pernah dibaca,
   dibaca dua kali, dan kalau hasilnya tidak berubah.
5. **TC39 polyfill.** Bangun `effect` dengan `Signal.subtle.Watcher` seperti di bagian 5. Coba
   membaca signal di dalam callback `notify` dan catat error yang muncul.
6. **Solid vs React.** Buat counter yang sama di Solid dan React, taruh `console.log("render")` di
   body komponen, lalu klik 5 kali. Hitung berapa kali log muncul di masing-masing.

Catat hasil dan kejutannya di [catatan eksperimen](/notes/). Eksperimen 3 adalah langkah pertama
proyek latihan "Mini signals library" di tahap 07.

## Implikasi praktis

- **Baca nilai di tempat yang dilacak.** Membaca signal di luar effect atau computed (misalnya saat
  destructure props di Solid, atau menyimpan `.value` ke variabel) memutus reaktivitas.
- **Turunkan nilai dengan `computed`, bukan effect yang menulis ke signal lain.** Effect yang
  menyalin state adalah sumber glitch dan render berantai, sama seperti "you might not need an
  effect" di React.
- **Effect untuk dunia luar saja:** DOM, network, storage, logging.
- **Equality cut-off itu fitur.** Pecah computed besar menjadi beberapa computed kecil yang
  hasilnya jarang berubah, supaya cabang graf di bawahnya bisa berhenti lebih awal.
- **Object yang dimutasi tidak terdeteksi.** `list.value.push(x)` tidak memicu apa pun karena
  identitasnya sama. Ganti dengan nilai baru (`list.value = [...list.value, x]`) atau pakai store
  berbasis `Proxy` seperti `reactive()` di Vue.
- **Signals vs VDOM bukan soal siapa yang lebih cepat di semua kasus.** Signals unggul untuk
  update kecil yang sering. VDOM lebih sederhana untuk dipikirkan ("UI = f(state)") dan React
  Compiler mengurangi biaya render ulang. Pahami keduanya.

## Sumber primer

- [TC39 Signals proposal](https://github.com/tc39/proposal-signals) dan
  [`signal-polyfill`](https://github.com/proposal-signals/signal-polyfill)
- [Knockout: Computed observables](https://knockoutjs.com/documentation/computedObservables.html)
  dan [How dependency tracking works](https://knockoutjs.com/documentation/computed-dependency-tracking.html)
- [S.js](https://github.com/adamhaile/S)
- [SolidJS: Fine-grained reactivity](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity)
- Ryan Carniato, [*A Hands-on Introduction to Fine-Grained Reactivity*](https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf)
- [Preact: Introducing Signals](https://preactjs.com/blog/introducing-signals/) dan
  [source `@preact/signals-core`](https://github.com/preactjs/signals/tree/main/packages/core)
- [Vue: Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Angular: Signals](https://angular.dev/guide/signals)
- [Svelte 5: Runes](https://svelte.dev/docs/svelte/what-are-runes)
