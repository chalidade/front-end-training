import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { chalidade, type ChalidadeOptions } from "./index";

async function lint(code: string, options: ChalidadeOptions = {}, filePath = "src/file.ts", cwd = process.cwd()) {
  const eslint = new ESLint({ cwd, overrideConfigFile: true, overrideConfig: chalidade(options) });
  const [result] = await eslint.lintText(code, { filePath: join(cwd, filePath) });
  return (result?.messages ?? []).map((m) => `${m.severity === 2 ? "error" : "warn"} ${m.ruleId}`);
}

describe("chalidade()", () => {
  it("lolos untuk kode yang bersih", async () => {
    const code = [
      'import { type Foo } from "./foo";',
      "export function pick(_unused: number, foo: Foo | null): string {",
      "  if (foo == null) return \"\";",
      "  const { id, ...rest } = foo;",
      "  console.error(rest);",
      "  return String(id);",
      "}",
      "",
    ].join("\n");
    expect(await lint(code)).toEqual([]);
  });

  it("menangkap bug umum dari preset dan aturan tambahan", async () => {
    const code = [
      'import { Foo } from "./foo";',
      "var x: Foo | 1 = 1;",
      "let y = 2;",
      "if (x == 1) console.log(y);",
      "const unused = 3;",
      "",
    ].join("\n");
    expect(await lint(code)).toEqual([
      "error @typescript-eslint/consistent-type-imports",
      "error no-var",
      "error prefer-const",
      "error eqeqeq",
      "warn no-console",
      "error @typescript-eslint/no-unused-vars",
    ]);
  });

  it("mengenali global browser dan node sesuai env", async () => {
    const code = "export const a = [window.innerWidth, process.env.NODE_ENV];\n";
    expect(await lint(code, {}, "a.js")).toEqual([]);
    expect(await lint(code, { env: ["browser"] }, "a.js")).toEqual(["error no-undef"]);
  });

  it("aturan formatting dimatikan supaya tidak bentrok dengan Prettier", async () => {
    const config = chalidade({ react: true });
    const last = config.at(-1);
    expect(last?.name).toBe("chalidade/prettier");
    expect(last?.rules?.["curly"]).toBe(0);
    expect(last?.rules?.["@typescript-eslint/no-unused-vars"]).toBeUndefined();
  });

  it("react: true mengaktifkan rules-of-hooks dan exhaustive-deps", async () => {
    const code = [
      'import { useEffect, useState } from "react";',
      "export function Search({ q }: { q: string }) {",
      "  if (!q) {",
      "    const [n] = useState(0);",
      "    return n;",
      "  }",
      "  useEffect(() => {",
      "    fetch(`/api?q=${q}`);",
      "  }, []);",
      "  return null;",
      "}",
      "",
    ].join("\n");
    expect(await lint(code, {}, "src/Search.tsx")).toEqual([]);
    expect(await lint(code, { react: true }, "src/Search.tsx")).toEqual(
      expect.arrayContaining(["error react-hooks/rules-of-hooks", "warn react-hooks/exhaustive-deps"]),
    );
  });

  it("mengabaikan folder build", async () => {
    const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: chalidade({ ignores: ["legacy/**"] }) });
    expect(await eslint.isPathIgnored("dist/index.js")).toBe(true);
    expect(await eslint.isPathIgnored("packages/a/coverage/x.js")).toBe(true);
    expect(await eslint.isPathIgnored("legacy/old.js")).toBe(true);
    expect(await eslint.isPathIgnored("src/index.ts")).toBe(false);
  });

  it("typeChecked menangkap promise yang tidak di-await", { timeout: 30000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), "chalidade-eslint-"));
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { strict: true, target: "ES2022", module: "ESNext", lib: ["ES2022", "DOM"] }, include: ["*.ts"] }),
    );
    const code = "export async function save(): Promise<void> {}\nexport function onClick(): void {\n  save();\n}\n";
    writeFileSync(join(dir, "a.ts"), code);
    writeFileSync(join(dir, "b.js"), "export const b = 1;\n");

    expect(await lint(code, {}, "a.ts", dir)).toEqual([]);
    const typed = { typeChecked: { tsconfigRootDir: dir } };
    expect(await lint(code, typed, "a.ts", dir)).toEqual(["error @typescript-eslint/no-floating-promises"]);
    // File JS di luar tsconfig tidak error "file not found in project".
    expect(await lint("export const b = 1;\n", typed, "b.js", dir)).toEqual([]);
  });
});
