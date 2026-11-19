import { describe, expect, it } from "vitest";
import { flatten, theme, themeVar, toCss, type ThemeName, type ThemeToken } from "./index";

describe("flatten", () => {
  it("meratakan objek bertingkat menjadi nama CSS variable", () => {
    expect(flatten({ color: { indigo: { 500: "#6366f1" } }, font: { lineHeight: { tight: "1.2" } } })).toEqual({
      "--fet-color-indigo-500": "#6366f1",
      "--fet-font-line-height-tight": "1.2",
    });
  });

  it("menambahkan px ke angka dan mengganti titik", () => {
    expect(flatten({ space: { 0.5: "0.125rem" }, breakpoint: { sm: 640 } }, "x")).toEqual({
      "--x-space-0_5": "0.125rem",
      "--x-breakpoint-sm": "640px",
    });
  });
});

describe("toCss", () => {
  const css = toCss();

  it("memuat token dasar dan semantik di :root", () => {
    expect(css).toContain("--fet-color-indigo-600: #4f46e5;");
    expect(css).toContain("--fet-space-4: 1rem;");
    expect(css).toContain("--fet-theme-primary: #4f46e5;");
  });

  it("menyediakan mode gelap lewat media query dan data-theme", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toMatch(/\[data-theme="dark"\] \{[^}]*--fet-theme-bg: #020617;/);
  });

  it("memakai prefix kustom", () => {
    expect(toCss({ prefix: "app" })).toContain("--app-theme-fg:");
  });
});

describe("theme", () => {
  it("mode terang dan gelap punya kunci yang sama", () => {
    expect(Object.keys(theme.dark).sort()).toEqual(Object.keys(theme.light).sort());
  });

  it("themeVar menghasilkan referensi var()", () => {
    expect(themeVar("primaryHover")).toBe("var(--fet-theme-primary-hover)");
  });
});

/** Rasio kontras WCAG 2.x antara dua warna hex `#rrggbb`. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("kontras tema (WCAG 2.2 AA)", () => {
  // [teks/latar depan, latar, rasio minimum]. 4.5 untuk teks normal (1.4.3), 3 untuk indikator UI (1.4.11).
  const pairs: [ThemeToken, ThemeToken, number][] = [
    ["fg", "bg", 4.5],
    ["fg", "surface", 4.5],
    ["fg", "bgSubtle", 4.5],
    ["fgMuted", "bg", 4.5],
    ["fgMuted", "surface", 4.5],
    ["fgMuted", "bgSubtle", 4.5],
    ["onPrimary", "primary", 4.5],
    ["onPrimary", "primaryHover", 4.5],
    ["primary", "bg", 4.5],
    ["primary", "surface", 4.5],
    ["accent", "bg", 4.5],
    ["success", "bg", 4.5],
    ["warning", "bg", 4.5],
    ["danger", "bg", 4.5],
    ["focusRing", "bg", 3],
  ];

  for (const mode of Object.keys(theme) as ThemeName[]) {
    it.each(pairs)(`${mode}: %s di atas %s minimal %d:1`, (fg, bg, min) => {
      expect(contrast(theme[mode][fg], theme[mode][bg])).toBeGreaterThanOrEqual(min);
    });
  }
});
