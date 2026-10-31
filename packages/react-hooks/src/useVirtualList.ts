import { useCallback, useState, type RefObject } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import { useLatest } from "./useLatest";

export interface VirtualListOptions {
  /** Jumlah seluruh baris. */
  count: number;
  /** Tinggi setiap baris dalam px (harus sama untuk semua baris). */
  itemHeight: number;
  /** Baris tambahan di atas dan bawah area terlihat, supaya scroll cepat tidak menampilkan celah. */
  overscan?: number;
}

export interface VirtualItem {
  index: number;
  /** Posisi `top` baris dalam px, relatif terhadap awal list. */
  start: number;
}

export interface VirtualList {
  /** Baris yang perlu dirender saat ini. */
  items: VirtualItem[];
  /** Tinggi seluruh list, untuk elemen pengganjal di dalam container scroll. */
  totalHeight: number;
  scrollToIndex(index: number): void;
}

interface Viewport {
  /** Indeks baris pertama yang terlihat. */
  first: number;
  height: number;
}

/**
 * Virtualisasi list dengan tinggi baris tetap: hanya baris yang terlihat (plus `overscan`) yang
 * dirender. `ref` menunjuk container yang punya `overflow: auto` dan tinggi tertentu. Komponen
 * hanya render ulang saat baris pertama yang terlihat atau tinggi container berubah, bukan di
 * setiap piksel scroll.
 */
export function useVirtualList(
  ref: RefObject<HTMLElement | null>,
  { count, itemHeight, overscan = 3 }: VirtualListOptions,
): VirtualList {
  const [viewport, setViewport] = useState<Viewport>({ first: 0, height: 0 });
  const latestHeight = useLatest(itemHeight);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const first = Math.floor(el.scrollTop / latestHeight.current);
      const height = el.clientHeight;
      setViewport((prev) => (prev.first === first && prev.height === height ? prev : { first, height }));
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [ref, latestHeight, itemHeight]);

  const visible = Math.ceil(viewport.height / itemHeight) + 1;
  const start = Math.max(0, Math.min(viewport.first, count) - overscan);
  const end = Math.min(count, viewport.first + visible + overscan);
  const items: VirtualItem[] = [];
  for (let index = start; index < end; index++) items.push({ index, start: index * itemHeight });

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = ref.current;
      if (el) el.scrollTop = Math.max(0, Math.min(index, count - 1)) * itemHeight;
    },
    [ref, count, itemHeight],
  );

  return { items, totalHeight: count * itemHeight, scrollToIndex };
}
