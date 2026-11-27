import js from "@eslint/js";
import type { Linter } from "eslint";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export interface ChalidadeOptions {
  /** Aturan React Hooks (rules-of-hooks, exhaustive-deps, dan aturan React Compiler). Default `false`. */
  react?: boolean;
  /**
   * Type-aware linting (misalnya `no-floating-promises`). Lebih lambat karena ESLint harus
   * menjalankan TypeScript. Isi dengan folder yang berisi `tsconfig.json`, biasanya
   * `import.meta.dirname`. Default mati.
   */
  typeChecked?: { tsconfigRootDir: string } | false;
  /** Lingkungan global: `"browser"`, `"node"`, atau keduanya. Default keduanya. */
  env?: readonly ("browser" | "node")[];
  /** Pola file tambahan yang diabaikan, selain `dist`, `build`, `coverage`, dan `.vitepress/cache`. */
  ignores?: readonly string[];
}

const JS_FILES = ["**/*.{js,mjs,cjs,jsx}"];

/**
 * Aturan tambahan di atas preset `recommended`. Sedikit, dan masing-masing menangkap bug
 * atau membuat kode lebih mudah dibaca, bukan soal gaya. Gaya diserahkan ke Prettier.
 */
export const extraRules: Linter.RulesRecord = {
  // `==` hanya untuk `x == null` (null atau undefined sekaligus); selain itu pakai `===`.
  eqeqeq: ["error", "smart"],
  // console.log yang tertinggal di production; warn dan error tetap boleh.
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "prefer-const": "error",
  "no-var": "error",
  // `import type` terhapus saat build, jadi tidak ada side effect yang ikut termuat.
  "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
  // Prefix `_` untuk menandai parameter yang sengaja tidak dipakai.
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", ignoreRestSiblings: true },
  ],
};

/**
 * Membuat flat config ESLint. Urutannya penting: preset dasar, aturan tambahan, lalu
 * `eslint-config-prettier` paling akhir supaya semua aturan formatting yang bentrok
 * dengan Prettier dimatikan.
 */
export function chalidade(options: ChalidadeOptions = {}): Linter.Config[] {
  const { react = false, typeChecked = false, env = ["browser", "node"], ignores = [] } = options;

  const envGlobals = Object.assign({}, ...env.map((name) => globals[name])) as Linter.Globals;

  const configs: Linter.Config[] = [
    { name: "chalidade/ignores", ignores: ["**/dist/", "**/build/", "**/coverage/", "**/.vitepress/cache/", ...ignores] },
    { ...js.configs.recommended, name: "chalidade/js" },
    ...((typeChecked ? tseslint.configs.recommendedTypeChecked : tseslint.configs.recommended) as Linter.Config[]),
    {
      name: "chalidade/language",
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: envGlobals,
        ...(typeChecked
          ? { parserOptions: { projectService: true, tsconfigRootDir: typeChecked.tsconfigRootDir } }
          : {}),
      },
    },
    { name: "chalidade/rules", rules: extraRules },
  ];

  if (typeChecked) {
    // File JS biasanya tidak ada di tsconfig, jadi aturan type-aware dimatikan untuknya.
    configs.push({ ...(tseslint.configs.disableTypeChecked as Linter.Config), name: "chalidade/js-no-types", files: JS_FILES });
  }
  if (react) {
    configs.push({ ...(reactHooks.configs.flat.recommended as Linter.Config), name: "chalidade/react-hooks" });
  }
  configs.push({ ...prettier, name: "chalidade/prettier" });
  return configs;
}

export default chalidade;
