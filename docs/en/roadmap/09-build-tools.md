# 09 · Build Tools

> **Phase:** 4 · **Estimate:** 2–3 weeks · **Prerequisites:** [06 Package Managers](06-package-managers.md)

## Why it matters

Build tools decide what actually reaches the user's browser. Bundle size, dev server speed, and
"works in dev but breaks in prod" bugs all come from here.

## Concept map

### Basics
- [ ] Why you need a bundler: module graph, transpilation, minification
- [ ] Vite as the modern default (ESM dev server + Rollup/Rolldown for builds)
- [ ] Bundlers: Webpack, Rollup, Parcel, esbuild
- [ ] Transpilers/compilers: Babel, SWC, esbuild

### Intermediate
- [ ] Tree-shaking and `sideEffects`
- [ ] Code splitting: dynamic `import()`, chunking strategy
- [ ] File name hashing and long-term caching
- [ ] Source maps
- [ ] Environment variables and dead code elimination
- [ ] Browserslist, polyfills, and targets

### Deep dive
- [ ] How bundlers build the module graph and perform scope hoisting
- [ ] Hot Module Replacement: the protocol and boundaries
- [ ] Why esbuild/SWC/Rolldown are fast (native languages, parallelism, few AST passes)
- [ ] Module Federation

## How to learn

1. Create a Vite project, run `vite build`, then analyze the output with `rollup-plugin-visualizer`.
2. Import one function from `lodash` vs `lodash-es` and compare the bundle sizes.
3. Write a simple Vite plugin (for example, inject a build timestamp).
4. Read Rollup's output for two small modules and observe scope hoisting.

## Check your understanding

1. Why does tree-shaking fail on CommonJS modules?
2. What does the `sideEffects: false` field do, and when is it dangerous?
3. Why is the Vite dev server fast even though it doesn't bundle during development?
4. How does a content hash in the file name make `Cache-Control: immutable` safe?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | Migrate a Webpack (CRA) project to Vite | Configuration |
| Intermediate | Cut a real app's bundle by at least 30% with analysis + code splitting | Optimization |
| Deep | **Mini bundler:** parse imports with a JS parser, build the graph, emit a single bundle file | Module graph |

## Primary sources

- [Vite: Why Vite](https://vite.dev/guide/why) and [Plugin API](https://vite.dev/guide/api-plugin)
- [Rollup docs](https://rollupjs.org/)
- [esbuild: architecture notes](https://github.com/evanw/esbuild/blob/main/docs/architecture.md)

## Related toolkit

- The packages in this repo are built with tsup (based on esbuild)
- Deep dive: [A module bundler from scratch](../deep-dives/module-bundler.md)
