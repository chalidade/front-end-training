# Deep Dive: State Management, Model Mental, Bukan Library

> Terkait: [07 Framework](../roadmap/07-framework.md), [19 GraphQL & Data Fetching](../roadmap/19-graphql-data-fetching.md).
> Deep dive lain: [Signals](signals.md), [Efisiensi di React](react-efficiency.md),
> [React Fiber](react-fiber.md)

## Pertanyaan pembuka

Redux, Zustand, Jotai, MobX, Valtio, XState, TanStack Query, Context. Setiap tahun ada library state
baru, dan setiap perdebatan berakhir di "tergantung". Tergantung apa, tepatnya? Kenapa memindahkan
satu nilai dari Context ke Zustand bisa membuat aplikasi terasa lebih cepat? Kenapa
`isLoading` dan `isError` bisa sama-sama `true`? Dan kenapa data dari API sebaiknya tidak disimpan
di store yang sama dengan status modal?

## Model mental

Hampir semua state management adalah variasi dari tiga pertanyaan:

1. **Di mana state disimpan?** Di dalam komponen (`useState`), di atas pohon (Context), atau di luar
   React (store eksternal).
2. **Siapa yang diberi tahu saat berubah?** Semua konsumen, atau hanya yang membaca bagian yang
   berubah.
3. **Siapa pemilik kebenarannya?** Browser (UI state), URL, atau server (state yang hanya kita
   salin sementara).

Sebelum memilih library, kelompokkan dulu state-mu:

| Jenis | Contoh | Pemilik kebenaran | Alat yang cocok |
| --- | --- | --- | --- |
| **UI lokal** | input terbuka/tertutup, hover | komponen | `useState`, `useReducer` |
| **UI bersama** | tema, sidebar, keranjang belum checkout | aplikasi | Context (jarang berubah), store eksternal (sering berubah) |
| **URL** | filter, halaman, tab aktif | address bar | router, `URLSearchParams` |
| **Form** | nilai field, error, touched | form | React Hook Form, `<form>` + action |
| **Server** | daftar user, detail produk | **server** | TanStack Query, SWR, Apollo, Relay |
| **Turunan** | total harga, list terfilter | dihitung dari yang lain | **jangan disimpan**, hitung saat render |

Kesalahan paling mahal biasanya ada di dua baris terakhir: menyimpan **server state** di store
global seolah-olah kita pemiliknya, dan menyimpan **state turunan** sehingga harus disinkronkan
manual dengan sumbernya.

## Mekanisme detail

### 1. Inti setiap store: state, subscribe, snapshot

Lepaskan API dan nama, dan hampir setiap store eksternal (Redux, Zustand, Jotai di balik layar)
punya bentuk yang sama:

```ts
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: Partial<T>) {
      state = { ...state, ...next }; // objek baru: perubahan bisa dideteksi dengan ===
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
```

React menyambungkan store seperti ini lewat `useSyncExternalStore(subscribe, getSnapshot)`. Setiap
kali listener dipanggil, React memanggil `getSnapshot()` dan membandingkan hasilnya dengan
`Object.is`. Kalau sama, komponen **tidak** dirender ulang. Itulah seluruh rahasia *selector*:

```ts
function useStore<T, S>(store: Store<T>, selector: (s: T) => S) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}

const count = useStore(store, (s) => s.count); // hanya render ulang saat count berubah
```

Hook ini juga menyelesaikan masalah *tearing*: dengan concurrent rendering, React bisa menjeda
render di tengah jalan. Kalau store berubah saat jeda, sebagian komponen bisa menampilkan nilai lama
dan sebagian nilai baru. `useSyncExternalStore` mendeteksi itu dan merender ulang secara sinkron.

### 2. Kenapa Context bukan state management

Context adalah **mekanisme dependency injection**, bukan store. Ia tidak punya selector: setiap
komponen yang memanggil `useContext(Ctx)` dirender ulang saat `value` berubah menurut `Object.is`,
walaupun komponen itu hanya membaca satu field yang tidak berubah. Eksperimen 1 menunjukkan
angkanya.

Context tetap pilihan yang bagus untuk nilai yang **jarang berubah** (tema, locale, user yang
login, instance store itu sendiri). Untuk nilai yang sering berubah dan dibaca banyak komponen,
pecah Context per nilai, atau pindahkan ke store dengan selector.

### 3. Tiga keluarga model

| Model | Contoh | Cara kerja | Granularitas update |
| --- | --- | --- | --- |
| **Store tunggal + selector** | Redux Toolkit, Zustand | satu objek immutable, update lewat action/setter | sebesar selector |
| **Atom** | Jotai, Recoil, nanostores | banyak potongan state kecil, atom turunan membentuk graf | per atom |
| **Proxy / signal** | MobX, Valtio, Preact Signals | mutasi langsung, pembacaan dilacak otomatis | per properti yang dibaca |

Ketiganya menjawab pertanyaan nomor 2 dengan cara berbeda. Store tunggal memaksamu menulis
selector. Atom membuat granularitas jadi bawaan karena setiap atom punya subscriber sendiri. Proxy
dan signal melacak properti apa yang dibaca saat render, jadi tidak perlu selector sama sekali
(mekanismenya dibahas di deep dive [Signals](signals.md)). Harganya: semakin otomatis pelacakannya,
semakin sulit melihat **kenapa** sesuatu dirender ulang.

Satu hal yang sama untuk ketiganya: **perubahan harus bisa dideteksi**. Store immutable
mendeteksinya lewat referensi baru (`===`), proxy dan signal lewat intersepsi penulisan. Mutasi
langsung pada objek di store immutable (`state.items.push(x)`) tidak terdeteksi, dan UI diam saja.

### 4. Snapshot harus stabil

Konsekuensi dari perbandingan `Object.is`: `getSnapshot` harus mengembalikan nilai yang **sama
persis** selama store tidak berubah. Selector yang membuat objek baru setiap kali dipanggil
(`(s) => ({ count: s.count })`) membuat React mengira store selalu berubah. Hasilnya bukan sekadar
render berlebih, melainkan loop tak berhingga (Eksperimen 2). Solusinya: kembalikan nilai primitif,
pilih beberapa selector terpisah, atau memoize hasil selector (`useShallow` di Zustand,
`createSelector` di Reselect).

### 5. Impossible states dan state machine

Bentuk state menentukan bug apa yang mungkin terjadi. Tiga boolean independen (`isLoading`,
`isError`, `isSuccess`) punya 2³ = 8 kombinasi, padahal hanya empat yang bermakna. Sisanya,
seperti loading sekaligus error, adalah bug yang menunggu terjadi.

Discriminated union membuat state yang mustahil **tidak bisa ditulis**:

```ts
type Remote<T> =
  | { status: "idle" }
  | { status: "loading"; data?: T }
  | { status: "success"; data: T }
  | { status: "error"; error: string; data?: T };
```

Langkah berikutnya adalah membatasi **transisi**: event `OK` hanya berarti sesuatu saat statusnya
`loading`. Inilah ide state machine (XState, atau cukup `useReducer` dengan `switch`). Respons yang
datang terlambat setelah request baru dimulai tidak bisa menimpa hasil yang lebih baru.

### 6. Server state adalah cache, bukan state

Data dari API bukan milikmu. Yang kamu punya hanyalah **salinan yang bisa basi**. Karena itu
masalahnya berbeda dari UI state: deduplikasi request yang sama, kapan data dianggap basi
(*stale time*), kapan dibuang (*garbage collection*), refetch saat tab kembali fokus, invalidasi
setelah mutation, dan optimistic update dengan rollback.

Library server state (TanStack Query, SWR, Apollo, Relay) adalah **cache dengan kunci**: hasil
`fetch` disimpan per key (`["user", 1]`), komponen berlangganan ke key itu, dan library mengurus
siklus hidupnya. Begitu server state pindah ke sana, isi store global biasanya menyusut drastis,
dan sering kali sisa UI state-nya cukup ditangani `useState` dan Context.

## Eksperimen

Eksperimen 1 dan 2 dijalankan dengan React 19.3.1 di vitest + jsdom (taruh di
`packages/react-hooks/src/` lalu `npx vitest run <file>`). Eksperimen 3 dan 4 cukup dengan Node.
Semua output di bawah adalah hasil asli.

**1. Menghitung render: store dengan selector vs Context.** Dua komponen, satu membaca `count`,
satu membaca `theme`. Lalu `count` diubah dua kali.

```tsx
const renders: Record<string, number> = {};
const bump = (k: string) => (renders[k] = (renders[k] ?? 0) + 1);

// Store + selector
const store = createStore({ count: 0, theme: "light" });
function Count() { bump("store:Count"); return <p>{useStore(store, (s) => s.count)}</p>; }
function Theme() { bump("store:Theme"); return <p>{useStore(store, (s) => s.theme)}</p>; }
render(<><Count /><Theme /></>);
act(() => store.set({ count: 1 }));
act(() => store.set({ count: 2 }));

// Context
const Ctx = createContext({ count: 0, theme: "light" });
let setCtx!: (v: { count: number; theme: string }) => void;
function Provider({ children }: { children: React.ReactNode }) {
  const [v, set] = useState({ count: 0, theme: "light" });
  setCtx = set;
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
function CCount() { bump("ctx:Count"); return <p>{useContext(Ctx).count}</p>; }
function CTheme() { bump("ctx:Theme"); return <p>{useContext(Ctx).theme}</p>; }
const Static = () => <><CCount /><CTheme /></>;
render(<Provider><Static /></Provider>); // children dibuat di luar Provider
act(() => setCtx({ count: 1, theme: "light" }));
act(() => setCtx({ count: 2, theme: "light" }));

console.log(renders);
```

```
{ 'store:Count': 3, 'store:Theme': 1, 'ctx:Count': 3, 'ctx:Theme': 3 }
```

Dengan selector, `Theme` hanya dirender sekali (mount). Dengan Context, `CTheme` dirender setiap
kali `count` berubah, padahal `theme` tidak pernah berubah. Perhatikan `children` sengaja dibuat di
luar `Provider`, jadi render ulang `CTheme` murni karena `useContext`, bukan karena induknya.
Dengan dua komponen bedanya kecil; dengan 500 baris tabel yang masing-masing membaca Context,
bedanya terasa.

**2. Snapshot yang tidak stabil.** Selector yang mengembalikan objek baru:

```tsx
function Bad() {
  const v = useStore(store, (s) => ({ count: s.count })); // objek baru setiap panggilan
  return <p>{v.count}</p>;
}
render(<Bad />);
```

```
console.error: The result of getSnapshot should be cached to avoid an infinite loop
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState ...
```

React memperingatkan lebih dulu, lalu menyerah. Ganti selector menjadi `(s) => s.count` dan
errornya hilang.

**3. Boolean flags vs discriminated union.**

```js
// Model boolean
let s = { isLoading: false, isError: false, data: null };
const startFetch = () => (s = { ...s, isLoading: true });           // lupa reset isError
const fail = () => (s = { ...s, isLoading: false, isError: true });
fail(); startFetch();
console.log("boolean:", s);

// Model union + transisi yang dibatasi
let u = { status: "idle" };
const transition = (state, event) => {
  switch (event.type) {
    case "FETCH": return { status: "loading", data: state.data };     // data lama tetap tampil
    case "OK": return state.status === "loading" ? { status: "success", data: event.data } : state;
    case "FAIL": return state.status === "loading" ? { status: "error", error: event.error, data: state.data } : state;
    default: return state;
  }
};
for (const e of [{ type: "FETCH" }, { type: "FAIL", error: "timeout" }, { type: "FETCH" },
  { type: "OK", data: [1, 2] }, { type: "FAIL", error: "late" }])
  console.log(e.type.padEnd(5), "→", JSON.stringify((u = transition(u, e))));
```

```
boolean: { isLoading: true, isError: true, data: null }
FETCH → {"status":"loading"}
FAIL  → {"status":"error","error":"timeout"}
FETCH → {"status":"loading"}
OK    → {"status":"success","data":[1,2]}
FAIL  → {"status":"success","data":[1,2]}
```

Model boolean menghasilkan "loading sekaligus error" hanya karena satu baris lupa. Model union
tidak bisa menulis kombinasi itu, dan `FAIL` yang datang terlambat (baris terakhir) diabaikan
karena statusnya sudah bukan `loading`.

**4. Mini query cache: dedup dan stale time.** Inti dari TanStack Query dalam ±20 baris.

```js
const cache = new Map(); // key → { data, updatedAt, promise }
let calls = 0;
const fetcher = (id) => new Promise((r) => setTimeout(() => r({ id, name: `user ${id}`, call: ++calls }), 20));

function query(key, fn, { staleTime = 0 } = {}) {
  const entry = cache.get(key) ?? {};
  const fresh = entry.updatedAt !== undefined && Date.now() - entry.updatedAt < staleTime;
  if (fresh) return Promise.resolve({ data: entry.data, from: "cache (fresh)" });
  if (entry.promise) return entry.promise.then((data) => ({ data, from: "dedup" }));
  const promise = fn().then((data) => {
    cache.set(key, { data, updatedAt: Date.now() });
    return data;
  });
  cache.set(key, { ...entry, promise });
  return promise.then((data) => ({ data, from: "network" }));
}

const opts = { staleTime: 100 };
const r = await Promise.all([1, 2, 3].map(() => query("user:1", () => fetcher(1), opts)));
console.log(r.map((x) => `${x.from} call#${x.data.call}`));
console.log((await query("user:1", () => fetcher(1), opts)).from);
await new Promise((ok) => setTimeout(ok, 120));
const late = await query("user:1", () => fetcher(1), opts);
console.log(late.from, "call#" + late.data.call, "| total request:", calls);
```

```
[ 'network call#1', 'dedup call#1', 'dedup call#1' ]
cache (fresh)
network call#2 | total request: 2
```

Tiga komponen yang meminta `user:1` bersamaan hanya memicu satu request. Permintaan berikutnya
dalam 100 ms dilayani dari cache, dan setelah basi baru ke network lagi. Versi ini selalu menunggu
network saat data basi; TanStack Query mengembalikan data lama dulu lalu memperbarui di latar
(*stale-while-revalidate*). Itu tantangan berikutnya, sekaligus titik awal proyek latihan "Mini
query cache" di tahap 19.

Catat hasil dan kejutannya di [catatan eksperimen](/notes/).

## Implikasi praktis

- **Klasifikasikan dulu, pilih library belakangan.** Pisahkan server state, URL state, form state,
  dan UI state. Sering kali yang tersisa untuk "state management" jauh lebih kecil dari dugaan.
- **Jangan simpan state turunan.** Hitung saat render; memoize hanya kalau terukur mahal.
- **Pakai TanStack Query/SWR (atau loader router) untuk data server**, bukan `useEffect` + store
  global. Dedup, cache, dan race condition sudah diurus.
- **Taruh state yang bisa dibagikan di URL:** filter, pencarian, halaman, tab. Gratis dapat
  bookmark, tombol back, dan link yang bisa dikirim.
- **Context untuk nilai yang jarang berubah;** store dengan selector untuk nilai yang sering berubah
  dan dibaca banyak komponen.
- **Selector harus mengembalikan nilai yang stabil.** Objek baru di setiap panggilan berarti render
  ulang terus, atau loop.
- **Modelkan status sebagai union, bukan kumpulan boolean,** dan batasi transisi yang diizinkan.

## Sumber primer

- [React: `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) dan
  [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
  (hindari state redundan dan kontradiktif)
- [Redux: Three Principles](https://redux.js.org/understanding/thinking-in-redux/three-principles)
  dan [Deriving Data with Selectors](https://redux.js.org/usage/deriving-data-selectors)
- [Zustand](https://zustand.docs.pmnd.rs/), [Jotai](https://jotai.org/),
  [MobX: The gist](https://mobx.js.org/the-gist-of-mobx.html)
- [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
  dan Dominik Dorfmeister, [*React Query as a State Manager*](https://tkdodo.eu/blog/react-query-as-a-state-manager)
- [XState docs](https://stately.ai/docs) dan David Khourshid,
  [*No, disabling a button is not app logic*](https://dev.to/davidkpiano/no-disabling-a-button-is-not-app-logic-598i)
- Kent C. Dodds, [*Stop using isLoading booleans*](https://kentcdodds.com/blog/stop-using-isloading-booleans)
- [React 18 Working Group: What is tearing?](https://github.com/reactwg/react-18/discussions/69)
