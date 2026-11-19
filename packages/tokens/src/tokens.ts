// Nilai dasar (primitive). Komponen sebaiknya memakai token semantik di `theme`,
// bukan langsung nilai ini, supaya mode gelap dan rebranding cukup mengganti satu tempat.

export const color = {
  white: "#ffffff",
  black: "#000000",
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  indigo: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
  },
  cyan: {
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
  },
  green: { 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d" },
  amber: { 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
  red: { 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c" },
} as const;

/** Skala 4px. Kunci = kelipatan 4px, jadi `space[4]` = 16px. */
export const space = {
  0: "0",
  px: "1px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

export const radius = {
  none: "0",
  sm: "0.375rem",
  md: "0.625rem",
  lg: "0.875rem",
  xl: "1.25rem",
  full: "9999px",
} as const;

export const font = {
  family: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  },
  /** Skala tipografi ~1.125 (major second) dengan line-height yang menyertainya. */
  size: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  lineHeight: { tight: "1.2", snug: "1.4", normal: "1.6" },
  weight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
} as const;

export const shadow = {
  sm: "0 1px 2px rgb(15 23 42 / 0.06)",
  md: "0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.06)",
  lg: "0 10px 32px rgb(15 23 42 / 0.12), 0 2px 6px rgb(15 23 42 / 0.06)",
} as const;

export const motion = {
  duration: { fast: "120ms", normal: "200ms", slow: "320ms" },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    enter: "cubic-bezier(0, 0, 0, 1)",
    exit: "cubic-bezier(0.3, 0, 1, 1)",
  },
} as const;

/** Batas bawah (min-width) tiap ukuran layar, dalam px. */
export const breakpoint = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

export const zIndex = { dropdown: 50, sticky: 100, overlay: 200, modal: 300, toast: 400 } as const;

/**
 * Token semantik untuk mode terang dan gelap. Kuncinya sama di kedua mode,
 * jadi komponen cukup memakai `var(--fet-theme-bg)` dan seterusnya.
 */
export const theme = {
  light: {
    bg: color.white,
    bgSubtle: color.slate[50],
    surface: color.white,
    fg: color.slate[900],
    fgMuted: color.slate[600],
    border: color.slate[200],
    primary: color.indigo[600],
    primaryHover: color.indigo[700],
    onPrimary: color.white,
    accent: color.cyan[700], // cyan-600 di atas putih hanya 3.68:1
    success: color.green[700],
    warning: color.amber[700],
    danger: color.red[600],
    focusRing: color.indigo[500],
  },
  dark: {
    bg: color.slate[950],
    bgSubtle: color.slate[900],
    surface: color.slate[900],
    fg: color.slate[100],
    fgMuted: color.slate[400],
    border: color.slate[800],
    // Mode gelap memakai primary yang lebih terang dengan teks gelap di atasnya: indigo-500 dengan
    // teks putih hanya 4.47:1, di bawah WCAG AA 4.5:1. Lihat test kontras di index.test.ts.
    primary: color.indigo[400],
    primaryHover: color.indigo[300],
    onPrimary: color.slate[950],
    accent: color.cyan[400],
    success: color.green[400],
    warning: color.amber[400],
    danger: color.red[400],
    focusRing: color.indigo[400],
  },
} as const;

export const tokens = { color, space, radius, font, shadow, motion, breakpoint, zIndex } as const;

export type Tokens = typeof tokens;
export type ThemeName = keyof typeof theme;
export type ThemeToken = keyof (typeof theme)["light"];
