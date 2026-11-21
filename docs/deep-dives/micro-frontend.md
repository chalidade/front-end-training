# Deep Dive: Micro-frontend, Kapan dan Kapan Tidak

> Terkait: [09 Build Tools](../roadmap/09-build-tools.md), [18 Rendering Strategies](../roadmap/18-rendering-strategies.md).
> Deep dive lain: [Module bundler dari nol](module-bundler.md), [Design system](design-system.md),
> [State management](state-management.md)

## Pertanyaan pembuka

Lima tim mengerjakan satu aplikasi React besar. Setiap rilis menunggu semua tim siap, satu test
yang gagal di halaman checkout menahan perbaikan di halaman katalog, dan build CI makan waktu 25
menit. Micro-frontend sering disebut sebagai jawabannya. Tapi apa sebenarnya yang dipecah? Kenapa
aplikasi tiba-tiba memuat React dua kali, lalu muncul error *Invalid hook call*? Kenapa tombol di
halaman katalog berubah merah setelah tim checkout deploy? Dan kapan semua biaya ini sepadan?

## Model mental

Micro-frontend adalah **keputusan organisasi yang diwujudkan dalam arsitektur**, bukan teknik
rendering. Tujuannya satu: tim bisa **membangun, menguji, dan deploy secara independen**. Kalau
tujuan itu tidak ada, hampir selalu ada cara yang lebih murah.

Hukum Conway berlaku di sini: struktur sistem cenderung meniru struktur komunikasi organisasi yang
membuatnya. Micro-frontend memanfaatkannya secara sengaja. Potongan dibuat **vertikal per domain
bisnis**, dan setiap tim memiliki satu potongan dari UI sampai API-nya:

```
            ┌──────────── shell (routing, layout, auth, design system) ────────────┐
 tim A      │  /katalog   → MFE katalog   ── API katalog                           │
 tim B      │  /checkout  → MFE checkout  ── API order, pembayaran                 │
 tim C      │  header     → MFE akun      ── API user                              │
            └──────────────────────────────────────────────────────────────────────┘
```

Setiap arsitektur micro-frontend menjawab tiga pertanyaan:

1. **Pembagian:** per halaman/rute (paling sederhana), atau per fragmen di halaman yang sama
   (lebih fleksibel, jauh lebih sulit).
2. **Komposisi:** di mana potongan-potongan digabung. Saat build, di server/edge, atau di browser
   saat runtime.
3. **Komunikasi:** bagaimana potongan saling bicara tanpa saling bergantung. Lewat URL, event, atau
   kontrak props yang sempit.

## Mekanisme detail

### 1. Empat tempat komposisi

| Tempat | Cara | Deploy independen? | Catatan |
| --- | --- | --- | --- |
| **Build time** | setiap MFE jadi paket npm, shell meng-install | tidak | rilis tetap lockstep; ini sebenarnya monolit modular |
| **Server / edge** | SSI, ESI, fragment HTML yang digabung server | ya | bagus untuk SEO dan first paint; interaktivitas perlu hydration per fragmen |
| **Client: iframe** | setiap MFE di `<iframe>` | ya | isolasi total; harga: routing, ukuran, aksesibilitas, komunikasi lewat `postMessage` |
| **Client: runtime JS** | shell memuat JS remote saat runtime (Module Federation, import maps + single-spa, Web Components) | ya | paling populer; semua masalah di bagian 2 sampai 4 muncul di sini |

Integrasi build time sering disebut micro-frontend, padahal tidak memenuhi tujuan utamanya: tim
checkout tetap harus menunggu shell rilis versi baru. Kalau itu yang kamu butuhkan, monorepo dengan
batas modul yang jelas biasanya lebih murah.

### 2. Komposisi runtime: shell hanya tahu manifest

Pada komposisi runtime, shell tidak membundel kode MFE. Ia hanya tahu **di mana** kode itu berada:

```json
{ "cart": "https://cdn.example.com/cart/2.0.0/remoteEntry.js" }
```

Deploy MFE berarti mengunggah bundle baru lalu mengganti satu baris di manifest. Shell memuat
bundle itu dengan dynamic `import()` dan memanggil fungsi yang disepakati, biasanya
`mount(element, props)` yang mengembalikan fungsi `unmount`. Fungsi kecil itu adalah **API publik**
antar tim. Mengubah bentuk `props` sama dengan breaking change di library (lihat bagian versioning
di [deep dive Design system](design-system.md)), dan sekarang tidak ada compiler yang memeriksanya,
karena kedua sisi dibuild terpisah. Eksperimen 2 menunjukkan akibatnya.

Konsekuensi lain: remote bisa **gagal dimuat** (CDN down, deploy setengah jadi). Shell harus
memperlakukan setiap remote seperti panggilan network: ada timeout, error boundary, dan fallback.

### 3. Dependency bersama dan masalah singleton

Dua MFE yang masing-masing membundel React akan mengirim React **dua kali**: lebih berat, dan lebih
buruk lagi, menjadi **dua instance**. Banyak library menyimpan state di variabel modul. React
menyimpan dispatcher hooks di sana, React Router menyimpan context, library state menyimpan store.
Dua instance berarti dua dunia yang tidak saling melihat. Gejalanya klasik: *Invalid hook call*,
context yang selalu bernilai default, atau user yang sudah login di header tapi tidak di checkout.

Module Federation menyelesaikannya dengan **share scope**: saat runtime, host dan remote
mendaftarkan dependency yang mereka bawa beserta versinya, lalu satu versi yang kompatibel dipilih
dan dipakai bersama.

```js
// webpack / Rspack ModuleFederationPlugin (ringkas)
shared: {
  react: { singleton: true, requiredVersion: "^19.0.0" },
  "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
}
```

`singleton: true` artinya "hanya boleh ada satu instance". Kalau versi yang tersedia tidak memenuhi
`requiredVersion`, yang muncul hanya peringatan di console, dan aplikasi tetap jalan dengan versi
yang mungkin tidak cocok. Upgrade major React di sistem micro-frontend tetap butuh koordinasi semua
tim, persis hal yang ingin dihindari. Inti mekanismenya ada di Eksperimen 1.

### 4. Komunikasi: sesempit mungkin

Semakin banyak yang dibagi antar MFE, semakin mereka kembali menjadi satu monolit, hanya saja kini
terdistribusi. Urutan preferensi yang umum:

1. **URL** sebagai sumber kebenaran bersama (`/produk/42?varian=merah`). Gratis, bisa di-bookmark,
   tidak ada coupling kode.
2. **Props saat mount** untuk data yang diberikan shell (user, locale, feature flag).
3. **Event** (`CustomEvent` di `window`, atau event bus kecil) untuk notifikasi seperti
   `cart:item-added`. Payload event juga kontrak, jadi beri versi (`cart:item-added.v1`).
4. **Store global bersama**: hindari. Ia menggabungkan siklus rilis semua tim lewat satu bentuk
   state.

Server state (data user, isi keranjang) sebaiknya diambil setiap MFE dari API-nya sendiri, bukan
dioper lewat shell. Lihat [deep dive State management](state-management.md).

### 5. Isolasi CSS

CSS global tidak mengenal batas tim. Dua MFE yang sama-sama mendefinisikan `.button` akan saling
menimpa, dan pemenangnya ditentukan oleh urutan stylesheet dimuat, yang di komposisi runtime bisa
berbeda di setiap kunjungan (lihat [CSS Cascade](css-cascade.md)). Pilihannya:

- **Konvensi prefix atau CSS Modules:** murah, efektif, tapi bergantung pada disiplin dan tooling
  setiap tim.
- **Shadow DOM** (lewat Web Components): stylesheet global tidak masuk, style di dalam tidak bocor
  keluar. Tapi properti yang diwariskan (`font-family`, `color`, CSS custom properties) tetap
  menembus batas. Itu kabar baik untuk token tema, dan kejutan untuk hal lain.
- **iframe:** isolasi total, dengan semua biayanya.

Konsistensi visual antar MFE tidak datang dari isolasi, tapi dari **design system bersama**: token
sebagai CSS custom properties (yang memang menembus shadow DOM) dan komponen ber-versi.

### 6. Harga yang harus dibayar

| Biaya | Dari mana |
| --- | --- |
| Payload | dependency terduplikasi, runtime federation, banyak request kecil |
| Performa | waterfall: shell → manifest → remote entry → chunk; hydration per fragmen |
| Konsistensi UX | setiap tim bisa memakai versi design system berbeda |
| Operasional | N pipeline, N deploy, versioning manifest, monitoring per remote |
| Testing | unit test per MFE mudah; yang sulit adalah test integrasi lintas versi |
| Debugging | stack trace melintasi bundle yang dibuild terpisah, source map dari banyak origin |

### 7. Kapan ya, kapan tidak

| Pakai micro-frontend kalau... | Jangan kalau... |
| --- | --- |
| ada beberapa tim (kasarnya 3+) yang benar-benar harus deploy independen | satu atau dua tim, atau masalahnya build lambat (perbaiki build-nya) |
| domain bisnis bisa dipotong vertikal dengan sedikit interaksi | hampir setiap halaman membutuhkan data dan state dari semua domain |
| perlu migrasi bertahap dari stack lama (strangler fig: rute baru di stack baru) | tujuannya "supaya tiap tim bebas pilih framework" |
| organisasi siap membayar platform team untuk shell, tooling, dan design system | belum ada design system dan aturan kontrak antar tim |

Alternatif yang sering cukup: **monorepo** (Nx, Turborepo, pnpm workspace) dengan batas modul yang
dijaga lint, kepemilikan kode lewat `CODEOWNERS`, dan build yang di-cache per paket. Repo ini
sendiri memakai pola itu untuk paket-paket `@chalidade/*`.

## Eksperimen

Eksperimen 1 dan 2 cukup dengan Node 22 (modul dimuat dari URL `data:` untuk meniru remote).
Eksperimen 3 butuh browser sungguhan: jsdom tidak menerapkan batas shadow DOM saat menghitung
`getComputedStyle`, jadi dijalankan dengan Chromium lewat Playwright. Semua output adalah hasil
asli.

**1. Dua instance vs share scope.** Sebuah "library" dengan state di variabel modul, seperti React.

```js
const lib = `
  globalThis.__n = (globalThis.__n ?? 0) + 1;
  export const id = "instance#" + globalThis.__n;
  let current = null;
  export const setUser = (u) => { current = u; };
  export const getUser = () => current;
`;
const url = (src, tag) => "data:text/javascript," + encodeURIComponent(src + `\n// ${tag}`);

// Tanpa sharing: setiap remote membundel salinannya sendiri (URL berbeda = instance berbeda).
const shellLib = await import(url(lib, "shell"));
const cartLib = await import(url(lib, "cart"));
shellLib.setUser("chalid");
console.log("tanpa share :", { shell: shellLib.id, cart: cartLib.id, cartSeesUser: cartLib.getUser() });

// Dengan share scope: yang pertama mendaftarkan instance, sisanya memakai yang sudah ada.
const shareScope = {};
async function requireShared(name, src) {
  shareScope[name] ??= import(url(src, name));
  return shareScope[name];
}
const a = await requireShared("lib", lib);
const b = await requireShared("lib", lib);
a.setUser("chalid");
console.log("dengan share:", { shell: a.id, cart: b.id, cartSeesUser: b.getUser() });
```

```
tanpa share : { shell: 'instance#1', cart: 'instance#2', cartSeesUser: null }
dengan share: { shell: 'instance#3', cart: 'instance#3', cartSeesUser: 'chalid' }
```

Kode library-nya identik, tapi karena dimuat dari dua URL berbeda, ESM menganggapnya dua modul.
Shell sudah menyimpan user, sementara cart melihat `null`. Ganti `setUser` dengan dispatcher hooks
React dan kamu mendapat *Invalid hook call*. Share scope yang asli juga membandingkan versi; coba
tambahkan `requiredVersion` dan pilih instance tertinggi yang memenuhinya.

**2. Kontrak `mount` yang berubah diam-diam.** Shell yang sama memuat tiga "deploy" remote cart.

```js
const remotes = {
  "cart@1.4.0": `export function mount(el, props) { el.text = "Keranjang: " + props.items + " item"; return () => { el.text = ""; }; }`,
  "cart@2.0.0": `export function mount(el, props) { el.text = "Keranjang (" + props.items.length + ")"; return () => { el.text = ""; }; }`,
};
const load = (key) => {
  if (!remotes[key]) return Promise.reject(new Error(`404 ${key}`));
  return import("data:text/javascript," + encodeURIComponent(remotes[key]));
};

async function render(manifest, props) {
  const el = { text: "" };
  try {
    const remote = await load(manifest.cart);
    remote.mount(el, props);
  } catch (e) {
    el.text = `[cart gagal: ${e.message}] fallback ditampilkan`;
  }
  return el.text;
}
console.log("v1.4.0:", await render({ cart: "cart@1.4.0" }, { items: 3 }));
console.log("v2.0.0:", await render({ cart: "cart@2.0.0" }, { items: 3 }));       // kontrak props berubah
console.log("v2.0.0:", await render({ cart: "cart@2.0.0" }, { items: ["a", "b"] }));
console.log("hilang:", await render({ cart: "cart@9.9.9" }, { items: 3 }));
```

```
v1.4.0: Keranjang: 3 item
v2.0.0: Keranjang (undefined)
v2.0.0: Keranjang (2)
hilang: [cart gagal: 404 cart@9.9.9] fallback ditampilkan
```

Baris kedua adalah bug paling berbahaya di micro-frontend: tim cart mengubah `items` dari angka
menjadi array, deploy, dan **tidak ada yang error**. Halaman hanya menampilkan `undefined`. Tidak
ada compiler yang membandingkan kedua sisi karena keduanya dibuild terpisah. Pertahanannya: tipe
kontrak yang dipublikasikan sebagai paket ber-versi, validasi props saat runtime di `mount`, dan
contract test di CI kedua tim. Baris terakhir menunjukkan kenapa setiap remote butuh fallback.

**3. Bentrok CSS dan shadow DOM** (Chromium lewat Playwright).

```js
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head>
    <style>/* dari MFE katalog */ .button { color: rgb(0, 128, 0); }</style>
    <style>/* dari MFE checkout, dimuat belakangan */ .button { color: rgb(255, 0, 0); }</style>
  </head><body>
    <div id="catalog"><button class="button">Beli</button></div>
    <div id="checkout"><button class="button">Bayar</button></div>
    <div id="isolated"></div>
  </body></html>`);
  const out = await page.evaluate(() => {
    const color = (el) => getComputedStyle(el).color;
    const r = {};
    r.katalog = color(document.querySelector("#catalog .button"));
    r.checkout = color(document.querySelector("#checkout .button"));
    // Shadow DOM: style global tidak masuk, style di dalam tidak bocor keluar.
    const root = document.querySelector("#isolated").attachShadow({ mode: "open" });
    root.innerHTML = `<style>.button { color: rgb(0, 0, 255); }</style><button class="button">Bayar</button>`;
    r.shadow = color(root.querySelector(".button"));
    r.checkoutSetelahShadow = color(document.querySelector("#checkout .button"));
    // Tapi properti yang diwariskan (inherited) tetap menembus batas shadow.
    document.body.style.fontFamily = "monospace";
    root.innerHTML += `<p>teks</p>`;
    r.shadowFont = getComputedStyle(root.querySelector("p")).fontFamily;
    return r;
  });
  console.log(out);
  await browser.close();
})();
```

```
{
  katalog: 'rgb(255, 0, 0)',
  checkout: 'rgb(255, 0, 0)',
  shadow: 'rgb(0, 0, 255)',
  checkoutSetelahShadow: 'rgb(255, 0, 0)',
  shadowFont: 'monospace'
}
```

Tombol katalog berwarna merah milik checkout karena stylesheet checkout dimuat belakangan dengan
specificity yang sama. Di komposisi runtime, urutan itu bisa berubah tergantung remote mana yang
selesai diunduh lebih dulu, jadi bug ini bisa muncul dan hilang sendiri. Di dalam shadow root,
style global tidak berlaku dan style lokal tidak bocor, tapi `font-family` dari `body` tetap
diwariskan. Coba jalankan contoh yang sama di jsdom: warna di dalam shadow root ikut merah, karena
jsdom tidak memodelkan batas itu. Itu juga pelajaran tentang batas alat test.

**4. (Tantangan) Import map sebagai manifest.** Di browser, `<script type="importmap">` bisa
menggantikan manifest buatan sendiri:

```html
<script type="importmap">
  { "imports": { "react": "https://esm.sh/react@19.3.1", "@shop/cart": "/cart/2.0.0/index.js" } }
</script>
<script type="module">
  import { mount } from "@shop/cart";
  mount(document.querySelector("#cart"), { items: ["a", "b"] });
</script>
```

Karena semua MFE meng-import `react` lewat nama yang sama, browser hanya memuat satu instance,
sehingga share scope gratis selama semua sepakat pada satu URL. Coba ganti versi `@shop/cart` di
import map tanpa build ulang apa pun, lalu amati di tab Network. Ini cara kerja single-spa dengan
import map.

Catat hasil dan kejutannya di [catatan eksperimen](/notes/).

## Implikasi praktis

- **Mulai dari pertanyaan organisasi, bukan teknologi.** Kalau tidak ada beberapa tim yang harus
  deploy independen, mulai dari monorepo dengan batas modul yang jelas.
- **Potong vertikal per domain dan per rute dulu.** Komposisi beberapa MFE di satu halaman jauh
  lebih mahal daripada satu MFE per rute.
- **Perlakukan `mount(el, props)` dan payload event sebagai API publik:** beri versi, publikasikan
  tipenya, validasi saat runtime, dan uji dengan contract test.
- **Bagikan sesedikit mungkin.** URL dan props dulu, event kalau perlu, store global hampir tidak
  pernah.
- **Singleton untuk framework dan library ber-state** (React, router, library state), dan sepakati
  rentang versinya di satu tempat.
- **Setiap remote butuh timeout, error boundary, dan fallback.** Remote yang gagal tidak boleh
  menjatuhkan seluruh halaman.
- **Design system dan token bersama adalah syarat, bukan bonus.** Tanpa itu, pengguna akan melihat
  lima aplikasi yang dijahit menjadi satu.
- **Ukur sebelum dan sesudah:** ukuran JS total, jumlah request, dan LCP. Biaya micro-frontend
  paling sering muncul di performa.

## Sumber primer

- Cam Jackson, [*Micro Frontends*](https://martinfowler.com/articles/micro-frontends.html) (martinfowler.com)
- Michael Geers, [micro-frontends.org](https://micro-frontends.org/) dan buku *Micro Frontends in Action*
- Luca Mezzalira, *Building Micro-Frontends* (O'Reilly)
- [webpack: Module Federation](https://webpack.js.org/concepts/module-federation/) dan
  [module-federation.io](https://module-federation.io/) (Rspack, Vite, runtime)
- [single-spa](https://single-spa.js.org/) dan [MDN: `<script type="importmap">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
- [React: Invalid Hook Call Warning](https://react.dev/warnings/invalid-hook-call-warning) (bagian "Duplicate React")
- [MDN: Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- Melvin Conway, [*How Do Committees Invent?*](https://www.melconway.com/Home/Committees_Paper.html) (1968)
- Martin Fowler, [*StranglerFigApplication*](https://martinfowler.com/bliki/StranglerFigApplication.html)
