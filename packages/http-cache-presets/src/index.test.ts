import { describe, expect, it } from "vitest";
import { cacheControl, cachePresets, presetFor, publicApi, toSeconds } from "./index";

describe("toSeconds", () => {
  it("menerima angka dan string berunit", () => {
    expect(toSeconds(90)).toBe(90);
    expect(toSeconds("30s")).toBe(30);
    expect(toSeconds("10m")).toBe(600);
    expect(toSeconds("1h")).toBe(3600);
    expect(toSeconds("7d")).toBe(604800);
    expect(toSeconds("1w")).toBe(604800);
    expect(toSeconds("1y")).toBe(31536000);
    expect(toSeconds("1.5m")).toBe(90);
  });

  it("menolak nilai negatif, pecahan detik, dan format salah", () => {
    expect(() => toSeconds(-1)).toThrow(/≥ 0/);
    expect(() => toSeconds(1.5)).toThrow(/bulat/);
    expect(() => toSeconds("1.5s")).toThrow(/bulat/);
    // @ts-expect-error unit tidak dikenal
    expect(() => toSeconds("1 hari")).toThrow(/tidak valid/);
  });
});

describe("cacheControl", () => {
  it("menyusun directive dengan urutan tetap", () => {
    expect(
      cacheControl({
        public: true,
        maxAge: "1m",
        sMaxAge: "1h",
        staleWhileRevalidate: "5m",
        staleIfError: "1d",
        noTransform: true,
      }),
    ).toBe("public, max-age=60, s-maxage=3600, stale-while-revalidate=300, stale-if-error=86400, no-transform");
    expect(cacheControl({ private: true, maxAge: 0, mustRevalidate: true })).toBe(
      "private, max-age=0, must-revalidate",
    );
  });

  it("no-store berdiri sendiri", () => {
    expect(cacheControl({ noStore: true })).toBe("no-store");
    expect(cacheControl({ noStore: true, public: false })).toBe("no-store");
    expect(() => cacheControl({ noStore: true, maxAge: "1h" })).toThrow(/maxAge/);
  });

  it("menolak kombinasi kontradiktif atau tidak berguna", () => {
    expect(() => cacheControl({ public: true, private: true })).toThrow(/bersamaan/);
    expect(() => cacheControl({ public: true, immutable: true })).toThrow(/butuh maxAge/);
    expect(() => cacheControl({ noCache: true, maxAge: "1y", immutable: true })).toThrow(/bertentangan/);
    expect(() => cacheControl({ private: true, sMaxAge: "1h" })).toThrow(/s-maxage/);
    expect(() => cacheControl({})).toThrow(/heuristic/);
  });
});

describe("cachePresets dan publicApi", () => {
  it("cocok dengan tabel di deep dive HTTP Caching", () => {
    expect(cachePresets).toEqual({
      immutable: "public, max-age=31536000, immutable",
      revalidate: "no-cache",
      private: "private, no-cache",
      sensitive: "no-store",
    });
    expect(publicApi()).toBe("public, max-age=60, stale-while-revalidate=300");
    expect(publicApi(30, "1h")).toBe("public, max-age=30, stale-while-revalidate=3600");
  });
});

describe("presetFor", () => {
  it("memberi immutable hanya untuk nama file ber-hash", () => {
    expect(presetFor("/static/app.3f9a1c7e.js")).toBe(cachePresets.immutable);
    expect(presetFor("/main-a1b2c3d4e5.css?v=2")).toBe(cachePresets.immutable);
    expect(presetFor("/")).toBe(cachePresets.revalidate);
    expect(presetFor("/index.html")).toBe(cachePresets.revalidate);
    expect(presetFor("/logo.png")).toBe(cachePresets.revalidate);
    // nama biasa yang panjang bukan hash
    expect(presetFor("/my-component.js")).toBe(cachePresets.revalidate);
  });

  it("menerima pola sendiri, misalnya folder assets/ milik Vite", () => {
    const vite = { hashed: /^\/assets\// };
    expect(presetFor("/assets/index-BvH2kQ_x.js", vite)).toBe(cachePresets.immutable);
    expect(presetFor("/favicon.svg", vite)).toBe(cachePresets.revalidate);
  });
});
