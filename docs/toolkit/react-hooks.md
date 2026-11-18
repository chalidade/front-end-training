# @chalidade/react-hooks

React hooks kecil yang aman untuk SSR dan teruji. Setiap hook menjawab satu masalah yang sering
salah ditulis sendiri: stale closure, listener yang lupa dilepas, atau hydration mismatch.

```bash
pnpm add @chalidade/react-hooks
```

::: warning Belum dipublish
Package ini belum dipublish ke npm. Sementara ini, salin source-nya dari
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/react-hooks/src).
:::

Membutuhkan React 18 atau lebih baru (`useSyncExternalStore`).

## Ringkasan

| Hook | Untuk apa |
| --- | --- |
| [`useDebouncedValue`](#usedebouncedvalue) | Nilai yang menunggu input berhenti (search) |
| [`useDebouncedCallback`](#usedebouncedcallback) | Fungsi debounce yang stabil antar render (autosave) |
| [`useThrottledCallback`](#usethrottledcallback) | Maksimal sekali per interval (scroll, resize, drag) |
| [`useOnline`](#useonline) | Status koneksi untuk banner offline |
| [`useMediaQuery`](#usemediaquery) | Responsif di JS tanpa hydration mismatch |
| [`useLocalStorage`](#uselocalstorage) | State yang tersimpan dan sinkron antar tab |
| [`useEventListener`](#useeventlistener) | Listener yang otomatis dilepas |
| [`useOnClickOutside`](#useonclickoutside) | Menutup dropdown/popover saat klik di luar |
| [`useIntersectionObserver`](#useintersectionobserver) | Lazy load, infinite scroll, animasi masuk |
| [`useVirtualList`](#usevirtuallist) | List ribuan baris: hanya baris terlihat yang dirender |
| [`usePrevious`](#useprevious) | Nilai di render sebelumnya |
| [`useLatest`](#uselatest) | Ref berisi nilai terbaru (anti stale closure) |
| `useIsomorphicLayoutEffect` | `useLayoutEffect` tanpa peringatan di server |

## `useDebouncedValue`

```tsx
const [input, setInput] = useState("");
const query = useDebouncedValue(input, 300);

useEffect(() => {
  if (query) void search(query);
}, [query]);
```

## `useDebouncedCallback`

Identitas fungsinya tetap sama antar render, tapi selalu memanggil callback terbaru. Panggilan
yang menunggu dibatalkan saat komponen unmount, jadi tidak ada `setState` setelah unmount.

```tsx
const save = useDebouncedCallback((draft: string) => api.save(draft), 1000);

<textarea onChange={(e) => save(e.target.value)} onBlur={() => save.flush()} />
```

## `useThrottledCallback`

Panggilan pertama langsung jalan, sisanya di jendela yang sama digabung menjadi satu panggilan di
akhir jendela dengan argumen terbaru. Cocok untuk event yang terus menyala selama interaksi.

```tsx
const onScroll = useThrottledCallback(() => setProgress(readScrollProgress()), 100);
useEventListener(window, "scroll", onScroll, { passive: true });
```

## `useOnline`

```tsx
const online = useOnline();
return online ? null : <p role="status">Kamu sedang offline. Perubahan disimpan lokal.</p>;
```

## `useMediaQuery`

```tsx
const isMobile = useMediaQuery("(max-width: 640px)");
const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
```

Di server nilainya `false` (atau argumen kedua). Karena memakai `useSyncExternalStore`, React
memakai nilai server saat hydration lalu memperbaruinya, jadi tidak ada hydration mismatch.

## `useLocalStorage`

```tsx
const [theme, setTheme, resetTheme] = useLocalStorage<"light" | "dark">("theme", "light");
```

- Komponen lain dengan key yang sama ikut ter-update.
- Tab lain ikut ter-update lewat event `storage`.
- Data rusak atau storage yang diblokir (mode privat) tidak membuat aplikasi crash: nilai kembali
  ke `initialValue`.

## `useEventListener`

```tsx
useEventListener(window, "keydown", (e) => {
  if (e.key === "Escape") close();
});

const ref = useRef<HTMLDivElement>(null);
useEventListener(ref, "scroll", onScroll, { passive: true });
```

Tipe event mengikuti target (`KeyboardEvent` untuk `keydown`, dst.).

## `useOnClickOutside`

```tsx
const ref = useRef<HTMLDivElement>(null);
useOnClickOutside(ref, () => setOpen(false));
return <div ref={ref}>{open && <Menu />}</div>;
```

Memakai `pointerdown` supaya juga bekerja di layar sentuh.

## `useIntersectionObserver`

```tsx
const { ref, isIntersecting } = useIntersectionObserver({ rootMargin: "200px", once: true });
return <img ref={ref} src={isIntersecting ? src : undefined} alt={alt} />;
```

## `useVirtualList`

Hanya baris yang terlihat (plus `overscan`) yang ada di DOM, jadi list 50.000 baris tetap ringan.
Semua baris harus setinggi `itemHeight`. Komponen hanya render ulang saat baris pertama yang
terlihat berubah, bukan di setiap piksel scroll. Penjelasan rumusnya ada di deep dive
[Efisiensi di React](/deep-dives/react-efficiency#_6-virtualisasi).

```tsx
const ref = useRef<HTMLDivElement>(null);
const { items, totalHeight, scrollToIndex } = useVirtualList(ref, { count: rows.length, itemHeight: 32 });

<div ref={ref} style={{ height: 400, overflow: "auto" }}>
  <div style={{ height: totalHeight, position: "relative" }}>
    {items.map(({ index, start }) => (
      <div key={index} style={{ position: "absolute", top: start, height: 32, width: "100%" }}>
        {rows[index].name}
      </div>
    ))}
  </div>
</div>
```

Untuk tinggi baris yang berbeda-beda, pakai library seperti TanStack Virtual atau CSS
`content-visibility: auto`.

## `usePrevious`

```tsx
const prevCount = usePrevious(count);
const direction = prevCount === undefined ? null : count > prevCount ? "naik" : "turun";
```

## `useLatest`

```tsx
const onTickRef = useLatest(onTick);
useEffect(() => {
  const id = setInterval(() => onTickRef.current(), 1000);
  return () => clearInterval(id);
}, []); // interval tidak perlu dipasang ulang saat onTick berubah
```

## Belajar dari source-nya

Coba tulis `useLocalStorage` versi `useState` + `useEffect` sendiri, lalu jalankan test di
`packages/react-hooks`. Kasus mana yang gagal? (Petunjuk: dua komponen dengan key yang sama, dan
render pertama di server.)

Konsep terkait: [07 Framework](/roadmap/07-framework), [17 Browser APIs](/roadmap/17-browser-apis),
[18 Rendering Strategies](/roadmap/18-rendering-strategies).
