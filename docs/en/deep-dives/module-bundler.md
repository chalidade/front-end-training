# Deep Dive: A Module Bundler from Scratch

> Related: [09 Build Tools](../roadmap/09-build-tools.md). Other deep dives:
> [HTTP Caching](http-caching.md), [How V8 works](v8.md)

## Opening questions

Modern browsers already understand `import`. So why do we still need Webpack, Rollup, esbuild, or
Vite at build time? What's actually inside `dist/assets/index-3f9a1c.js`? Why can a function you
never use disappear from the bundle while `import "./polyfill.js"` doesn't? And why does a circular
import sometimes give you `undefined` and sometimes a `ReferenceError`?

## Mental model

A bundler is a **compiler for a module graph**. It works in four steps:

```
 entry: src/main.js
    │
    ▼  1. parse      read the file, turn it into an AST, find import/export
    ▼  2. resolve    "./math.js" → /abs/path/src/math.js (node_modules, aliases, extensions)
    ▼  3. graph      repeat 1–2 for every dependency until there are no new files
    │
    │      main.js ──► math.js
    │         └─────► greet.js ──► math.js   (math.js is loaded only once)
    │
    ▼  4. generate   combine modules into one or more chunks + a small runtime
 dist/index-[hash].js
```

Between steps 3 and 4 come the things that make a bundler worth having: **transforms** (TypeScript,
JSX, CSS), **tree shaking**, **scope hoisting**, **code splitting**, **minification**, and
**content hashing** of file names.

Why not just ship hundreds of ESM files to the browser? Each `import` is a request that's only
discovered after its parent file has been downloaded and parsed. A graph 10 levels deep means 10
sequential network round trips (a *waterfall*). The bundler flattens that graph at build time.

## Detailed mechanism

### 1. A mini bundler in about 60 lines

This bundler really runs, using the [acorn](https://github.com/acornjs/acorn) parser. Step one: one
file becomes one module object.

```js
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "acorn";

let nextId = 0;
function createModule(file) {
  const code = readFileSync(file, "utf8");
  const ast = parse(code, { sourceType: "module", ecmaVersion: "latest" });
  const deps = [], edits = [], exportsOut = [];
  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      deps.push(node.source.value);
      const parts = node.specifiers.map((s) =>
        s.type === "ImportDefaultSpecifier" ? `default: ${s.local.name}` : `${s.imported.name}: ${s.local.name}`);
      edits.push([node.start, node.end,
        `const { ${parts.join(", ")} } = __require(${JSON.stringify(node.source.value)});`]);
    } else if (node.type === "ExportNamedDeclaration" && node.declaration) {
      edits.push([node.start, node.declaration.start, ""]); // drop the "export" keyword
      const d = node.declaration;
      const names = d.id ? [d.id.name] : d.declarations.map((x) => x.id.name);
      exportsOut.push(...names.map((n) => `exports.${n} = ${n};`));
    } else if (node.type === "ExportDefaultDeclaration") {
      edits.push([node.start, node.declaration.start, "exports.default = "]);
    }
  }
  let out = code;
  for (const [s, e, text] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + text + out.slice(e);
  return { id: nextId++, file, deps, code: out + "\n" + exportsOut.join("\n"), map: {} };
}
```

The key point: a bundler does **not** look for `import` with a regex. It reads the AST, so strings
or comments containing the word `import` can't fool it.

Step two: walk the graph breadth-first and give each file an id.

```js
function createGraph(entry) {
  const queue = [createModule(resolve(entry))];
  const byFile = new Map([[queue[0].file, queue[0]]]);
  for (const mod of queue) {
    for (const rel of mod.deps) {
      const abs = resolve(dirname(mod.file), rel);         // the simplest possible resolver
      if (!byFile.has(abs)) { const c = createModule(abs); byFile.set(abs, c); queue.push(c); }
      mod.map[rel] = byFile.get(abs).id;                    // "./math.js" → 1
    }
  }
  return queue;
}
```

Step three: wrap each module in a function and add a small runtime with a cache.

```js
function bundle(graph) {
  const modules = graph.map((m) =>
    `${m.id}: [function (__require, exports) {\n${m.code}\n}, ${JSON.stringify(m.map)}]`).join(",\n");
  return `(function (modules) {
  const cache = {};
  function load(id) {
    if (cache[id]) return cache[id].exports;
    const [fn, map] = modules[id];
    const module = (cache[id] = { exports: {} });
    fn((rel) => load(map[rel]), module.exports);
    return module.exports;
  }
  load(0);
})({\n${modules}\n});`;
}
```

For `main.js → math.js, greet.js` and `greet.js → math.js`, the graph is:

```
0 main.js -> {"./math.js":1,"./greet.js":2} | 1 math.js -> {} | 2 greet.js -> {"./math.js":1}
```

The result is a single 841-byte file that prints `hi fet #2 5`. `math.js` runs only once because of
the `cache`. This shape (a module object + a `__webpack_require__` function) is the core of
Webpack's runtime.

### 2. Circular imports: why the cache is filled before a module runs

Look at the order in `load`: `cache[id]` is set **before** `fn(...)` is called. Without that,
`a.js → b.js → a.js` would loop forever. As a result, when `b.js` asks for `a.js`, it gets
`a.js`'s `exports` object **before it has been filled in**:

```js
// a.js                                // b.js
import { b } from "./b.js";            import { a } from "./a.js";
export const a = "A";                  export const b = "B";
console.log("a sees", b);              console.log("b sees", typeof a === "undefined" ? "undefined" : a);
```

| Run with | Result |
| --- | --- |
| The mini bundler (CommonJS style) | `b sees undefined`, then `a sees B` |
| Native ESM in Node | `ReferenceError: Cannot access 'a' before initialization` |

Native ESM uses **live bindings**: the `a` in `b.js` is the same binding as the `a` in `a.js`, and
it's still in its *temporal dead zone*. Even `typeof a` throws. The mini bundler copies values
through destructuring, so it just sees `undefined`. Rollup and esbuild preserve ESM semantics, not
CommonJS semantics like this.

### 3. Scope hoisting

Wrapping every module in a function has a cost: one closure per module, access through an `exports`
object, and a minifier that can't rename across modules. Rollup and esbuild use **scope hoisting**:
every module goes into one scope, and clashing names are renamed. Here's esbuild's output for the
same example:

```js
(() => {
  // src/math.js
  function add(a, b) {
    return a + b;
  }

  // src/greet.js
  function greet(name) {
    return `hi ${name} #${add(1, 1)}`;
  }

  // src/main.js
  console.log(greet("fet"), add(2, 3));
})();
```

No runtime, no `require`. Notice also that `mul` from `math.js` is gone.

### 4. Tree shaking and `sideEffects`

Because ESM `import`/`export` are static (they can't go inside an `if`, and names must be literal),
a bundler can tell at build time which exports are used. Exports that are never referenced are
dropped. That's what removed `mul`.

But a bundler has to be careful with top-level code that has side effects:

```js
// side.js
export const unused = 1;
window.__tracked = true;   // side effect

// main2.js
import { add } from "./math.js";
import "./side.js";
console.log(add(2, 3));
```

Rollup's output (default settings) still includes `window.__tracked = true;`, because the bundler
can't prove that line is safe to drop. With `treeshake.moduleSideEffects: false` (equivalent to
`"sideEffects": false` in `package.json` for Webpack), that line goes too. That's what
`sideEffects` means: a **promise** from the package author that a module whose exports aren't used
can be dropped entirely. If the promise is wrong (for CSS files or polyfills, say), features
disappear silently. That's why it's usually written as `"sideEffects": ["*.css"]`.

CommonJS (`require` anywhere, `module.exports[name] = …`) is hard to tree-shake because its shape
is only known at runtime. That's why modern libraries ship an ESM build.

### 5. Code splitting and hashing

`import("./chart.js")` (a dynamic import) tells the bundler "split here". The bundler creates a new
chunk for the `chart.js` subgraph, and modules shared by several chunks move into a common chunk so
they aren't duplicated.

Each chunk is named after a **hash of its content** (`index-3f9a1c.js`). If the content doesn't
change, the name doesn't change, so the browser may cache it forever
(`Cache-Control: max-age=31536000, immutable`, see [HTTP Caching](http-caching.md)). Only
`index.html` must always be revalidated.

### 6. Dev server vs build

| | Dev (Vite) | Build (Rollup/Rolldown, esbuild, Webpack) |
| --- | --- | --- |
| Bundling | Not for your own code: the browser fetches ESM per file | Yes, the graph is flattened into chunks |
| Dependencies | *Pre-bundled* once with esbuild (many files → one) | Bundled along with everything else |
| Transforms | Per request, only for files that are opened | Every file in one pass |
| File changes | HMR: only that module and its *boundary* are replaced | Rebuild |

Vite is fast in dev because it skips steps 3–4 entirely. For production, request waterfalls and
file size matter again, so it still bundles.

## Experiments

All results below were verified with Node 22, `acorn@8.19.0`, `rollup@4.65.0`, and
`esbuild@0.27.7`.

1. **The mini bundler.** Copy the three snippets from section 1 into `bundle.mjs`, create `main.js`,
   `math.js`, and `greet.js`, then run `node bundle.mjs src/main.js > out.js && node out.js`. Add a
   `console.log` to `math.js` and show that it runs only once.
2. **Circular imports.** Run the `a.js`/`b.js` example with your mini bundler, then as `.mjs` files
   directly in Node. Change `export const a` to `export function a() {}` and try again. Why does the
   ESM result change? (Hint: function declarations are hoisted.)
3. **Compare outputs.** Bundle the same example with `npx esbuild src/main.js --bundle --format=iife`
   and with Rollup. Find out where `mul` went.
4. **`sideEffects`.** Repeat the `side.js` example with Rollup, once with the defaults and once with
   `treeshake: { moduleSideEffects: false }`. Then build a local package with
   `"sideEffects": false` that imports a CSS file, and watch the CSS disappear.
5. **Code splitting.** Add `import("./chart.js")` inside a click handler. Build with Vite and open
   the Network panel: when is the `chart-[hash].js` chunk downloaded?
6. **Bundle analysis.** Run `esbuild --bundle --metafile=meta.json` on a real project, then open
   `meta.json` in the [esbuild bundle analyzer](https://esbuild.github.io/analyze/). Find one
   dependency whose size surprises you.

Record your results and surprises in your [experiment notes](/en/notes/). Experiment 1 is the
starting point for the "Mini bundler" practice project in stage 09. Next challenges: support
`export { x } from`, `node_modules` resolution, and basic scope hoisting.

## Practical implications

- **Write and consume ESM.** Only static import/export can be tree-shaken reliably. Avoid
  `import * as lib` followed by dynamic property access.
- **Declare `sideEffects` honestly** in your packages, including CSS files and polyfills.
- **Avoid circular imports.** If you can't, don't read values from the other module at the top
  level; wrap the access in a function that's called later.
- **Barrel files (an `index.ts` that re-exports everything) have a cost.** The bundler has to parse
  every module in them, and a side effect in any one of them can keep the whole module.
- **Use dynamic `import()` at route boundaries and for heavy features**, not in every small
  component. Too many tiny chunks also adds requests.
- **Measure, don't guess:** check chunk sizes in the build output, use an analyzer, and track
  bundle size in CI.

## Primary sources

- [ECMAScript: Modules](https://tc39.es/ecma262/#sec-modules) (cyclic module records, live bindings)
- [Rollup: Tree-shaking](https://rollupjs.org/introduction/#tree-shaking) and
  [`treeshake` options](https://rollupjs.org/configuration-options/#treeshake)
- [esbuild: Architecture](https://github.com/evanw/esbuild/blob/main/docs/architecture.md)
- [webpack: Tree Shaking & `sideEffects`](https://webpack.js.org/guides/tree-shaking/)
- [Vite: Why Vite](https://vite.dev/guide/why) and
  [Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling)
- [acorn](https://github.com/acornjs/acorn) and the [ESTree spec](https://github.com/estree/estree)
- Ronen Amiel, [*minipack*](https://github.com/ronami/minipack): a mini bundler with thorough comments
- Lin Clark, [*ES modules: A cartoon deep-dive*](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)
