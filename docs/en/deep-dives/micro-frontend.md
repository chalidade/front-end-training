# Deep Dive: Micro-frontends, When and When Not

> Related: [09 Build Tools](../roadmap/09-build-tools.md), [18 Rendering Strategies](../roadmap/18-rendering-strategies.md).
> Other deep dives: [A module bundler from scratch](module-bundler.md), [Design systems](design-system.md),
> [State management](state-management.md)

## Opening questions

Five teams work on one large React app. Every release waits until every team is ready, one failing
test on the checkout page blocks a fix on the catalog page, and the CI build takes 25 minutes.
Micro-frontends are often offered as the answer. But what exactly gets split? Why does the app
suddenly load React twice and then throw *Invalid hook call*? Why does the catalog button turn red
after the checkout team deploys? And when are all these costs worth it?

## Mental model

A micro-frontend is **an organizational decision expressed as architecture**, not a rendering
technique. Its one goal: teams can **build, test, and deploy independently**. Without that goal,
there's almost always a cheaper option.

Conway's law applies: a system's structure tends to mirror the communication structure of the
organization that builds it. Micro-frontends use that deliberately. Slices are cut **vertically by
business domain**, and each team owns one slice from the UI down to its API:

```
            ┌──────────── shell (routing, layout, auth, design system) ────────────┐
 team A     │  /catalog   → catalog MFE   ── catalog API                           │
 team B     │  /checkout  → checkout MFE  ── order and payment APIs                │
 team C     │  header     → account MFE   ── user API                              │
            └──────────────────────────────────────────────────────────────────────┘
```

Every micro-frontend architecture answers three questions:

1. **Splitting:** per page/route (simplest), or per fragment on the same page (more flexible, much
   harder).
2. **Composition:** where the pieces are combined. At build time, on the server/edge, or in the
   browser at runtime.
3. **Communication:** how the pieces talk without depending on each other. Through the URL,
   events, or a narrow props contract.

## Detailed mechanism

### 1. Four places to compose

| Where | How | Independent deploys? | Notes |
| --- | --- | --- | --- |
| **Build time** | each MFE is an npm package the shell installs | no | releases stay lockstep; this is really a modular monolith |
| **Server / edge** | SSI, ESI, HTML fragments stitched by the server | yes | good for SEO and first paint; interactivity needs per-fragment hydration |
| **Client: iframe** | each MFE in an `<iframe>` | yes | total isolation; the price: routing, size, accessibility, `postMessage` communication |
| **Client: runtime JS** | the shell loads remote JS at runtime (Module Federation, import maps + single-spa, Web Components) | yes | the most popular; every problem in sections 2 to 4 shows up here |

Build-time integration is often called a micro-frontend, but it misses the main goal: the checkout
team still waits for the shell to release a new version. If that's what you need, a monorepo with
clear module boundaries is usually cheaper.

### 2. Runtime composition: the shell only knows a manifest

With runtime composition, the shell doesn't bundle the MFE's code. It only knows **where** that code
lives:

```json
{ "cart": "https://cdn.example.com/cart/2.0.0/remoteEntry.js" }
```

Deploying an MFE means uploading a new bundle and changing one line in the manifest. The shell loads
that bundle with dynamic `import()` and calls the agreed function, usually `mount(element, props)`,
which returns an `unmount` function. That small function is the **public API** between teams.
Changing the shape of `props` is a breaking change, just like in a library (see the versioning
section of the [Design systems deep dive](design-system.md)), and now no compiler checks it, because
the two sides are built separately. Experiment 2 shows the consequences.

Another consequence: a remote can **fail to load** (CDN down, half-finished deploy). The shell must
treat every remote like a network call: with a timeout, an error boundary, and a fallback.

### 3. Shared dependencies and the singleton problem

Two MFEs that each bundle React will ship React **twice**: heavier, and worse, **two instances**.
Many libraries keep state in module variables. React keeps its hooks dispatcher there, React Router
keeps its context, state libraries keep their stores. Two instances mean two worlds that can't see
each other. The symptoms are classic: *Invalid hook call*, a context that is always its default
value, or a user who is signed in in the header but not in checkout.

Module Federation solves this with a **share scope**: at runtime, the host and remotes register the
dependencies they bring along with their versions, and one compatible version is picked and shared.

```js
// webpack / Rspack ModuleFederationPlugin (abridged)
shared: {
  react: { singleton: true, requiredVersion: "^19.0.0" },
  "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
}
```

`singleton: true` means "only one instance allowed". If the available version doesn't satisfy
`requiredVersion`, you only get a console warning, and the app keeps running with a version that
may not fit. A major React upgrade in a micro-frontend system still needs every team to
coordinate, which is exactly what you were trying to avoid. The core mechanism is in Experiment 1.

### 4. Communication: as narrow as possible

The more MFEs share, the more they turn back into one monolith, only now a distributed one. A common
order of preference:

1. **The URL** as the shared source of truth (`/product/42?variant=red`). Free, bookmarkable, no
   code coupling.
2. **Props at mount time** for data the shell provides (user, locale, feature flags).
3. **Events** (`CustomEvent` on `window`, or a small event bus) for notifications like
   `cart:item-added`. Event payloads are contracts too, so version them (`cart:item-added.v1`).
4. **A shared global store**: avoid it. It ties every team's release cycle to a single state shape.

Server state (user data, cart contents) is better fetched by each MFE from its own API than passed
through the shell. See the [State management deep dive](state-management.md).

### 5. CSS isolation

Global CSS knows nothing about team boundaries. Two MFEs that both define `.button` overwrite each
other, and the winner is decided by stylesheet load order, which with runtime composition can differ
on every visit (see [CSS Cascade](css-cascade.md)). The options:

- **Prefix conventions or CSS Modules:** cheap and effective, but dependent on every team's
  discipline and tooling.
- **Shadow DOM** (via Web Components): global stylesheets don't get in, and styles inside don't
  leak out. But inherited properties (`font-family`, `color`, CSS custom properties) still cross the
  boundary. That's good news for theme tokens and a surprise for everything else.
- **iframes:** total isolation, with all of its costs.

Visual consistency across MFEs doesn't come from isolation; it comes from a **shared design
system**: tokens as CSS custom properties (which do cross the shadow DOM) and versioned components.

### 6. The price you pay

| Cost | Where it comes from |
| --- | --- |
| Payload | duplicated dependencies, the federation runtime, many small requests |
| Performance | waterfalls: shell → manifest → remote entry → chunks; per-fragment hydration |
| UX consistency | each team may use a different design system version |
| Operations | N pipelines, N deploys, manifest versioning, per-remote monitoring |
| Testing | per-MFE unit tests are easy; cross-version integration tests are the hard part |
| Debugging | stack traces cross separately built bundles, source maps come from many origins |

### 7. When yes, when no

| Use micro-frontends if... | Don't if... |
| --- | --- |
| several teams (roughly 3+) truly need to deploy independently | there are one or two teams, or the problem is a slow build (fix the build) |
| business domains can be cut vertically with little interaction | almost every page needs data and state from every domain |
| you need a gradual migration off an old stack (strangler fig: new routes on the new stack) | the goal is "so each team can pick its own framework" |
| the organization is ready to fund a platform team for the shell, tooling, and design system | there's no design system and no contract rules between teams yet |

An alternative that is often enough: a **monorepo** (Nx, Turborepo, pnpm workspaces) with module
boundaries enforced by lint, code ownership via `CODEOWNERS`, and builds cached per package. This
repo uses that pattern for its `@chalidade/*` packages.

## Experiments

Experiments 1 and 2 only need Node 22 (modules are loaded from `data:` URLs to mimic remotes).
Experiment 3 needs a real browser: jsdom doesn't apply the shadow DOM boundary when computing
`getComputedStyle`, so it runs in Chromium via Playwright. All output is real.

**1. Two instances vs a share scope.** A "library" with state in a module variable, like React.

```js
const lib = `
  globalThis.__n = (globalThis.__n ?? 0) + 1;
  export const id = "instance#" + globalThis.__n;
  let current = null;
  export const setUser = (u) => { current = u; };
  export const getUser = () => current;
`;
const url = (src, tag) => "data:text/javascript," + encodeURIComponent(src + `\n// ${tag}`);

// No sharing: each remote bundles its own copy (different URL = different instance).
const shellLib = await import(url(lib, "shell"));
const cartLib = await import(url(lib, "cart"));
shellLib.setUser("chalid");
console.log("tanpa share :", { shell: shellLib.id, cart: cartLib.id, cartSeesUser: cartLib.getUser() });

// With a share scope: the first one registers the instance, the rest reuse it.
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

(`tanpa share` / `dengan share` mean "without sharing" / "with sharing".) The library code is
identical, but because it is loaded from two different URLs, ESM treats it as two modules. The shell
has stored the user, while cart sees `null`. Swap `setUser` for React's hooks dispatcher and you get
*Invalid hook call*. A real share scope also compares versions; try adding `requiredVersion` and
picking the highest instance that satisfies it.

**2. A `mount` contract that changes silently.** The same shell loads three "deploys" of the cart
remote.

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
console.log("v2.0.0:", await render({ cart: "cart@2.0.0" }, { items: 3 }));       // props contract changed
console.log("v2.0.0:", await render({ cart: "cart@2.0.0" }, { items: ["a", "b"] }));
console.log("hilang:", await render({ cart: "cart@9.9.9" }, { items: 3 }));
```

```
v1.4.0: Keranjang: 3 item
v2.0.0: Keranjang (undefined)
v2.0.0: Keranjang (2)
hilang: [cart gagal: 404 cart@9.9.9] fallback ditampilkan
```

(`Keranjang` = cart, `hilang` = missing, `gagal` = failed.) The second line is the most dangerous
bug in micro-frontends: the cart team changes `items` from a number to an array, deploys, and
**nothing errors**. The page just shows `undefined`. No compiler compares the two sides, because
they're built separately. The defenses: contract types published as a versioned package, runtime
props validation in `mount`, and contract tests in both teams' CI. The last line shows why every
remote needs a fallback.

**3. CSS collisions and shadow DOM** (Chromium via Playwright).

```js
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head>
    <style>/* from the catalog MFE */ .button { color: rgb(0, 128, 0); }</style>
    <style>/* from the checkout MFE, loaded later */ .button { color: rgb(255, 0, 0); }</style>
  </head><body>
    <div id="catalog"><button class="button">Buy</button></div>
    <div id="checkout"><button class="button">Pay</button></div>
    <div id="isolated"></div>
  </body></html>`);
  const out = await page.evaluate(() => {
    const color = (el) => getComputedStyle(el).color;
    const r = {};
    r.katalog = color(document.querySelector("#catalog .button"));
    r.checkout = color(document.querySelector("#checkout .button"));
    // Shadow DOM: global styles don't get in, local styles don't leak out.
    const root = document.querySelector("#isolated").attachShadow({ mode: "open" });
    root.innerHTML = `<style>.button { color: rgb(0, 0, 255); }</style><button class="button">Pay</button>`;
    r.shadow = color(root.querySelector(".button"));
    r.checkoutSetelahShadow = color(document.querySelector("#checkout .button"));
    // But inherited properties still cross the shadow boundary.
    document.body.style.fontFamily = "monospace";
    root.innerHTML += `<p>text</p>`;
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

The catalog button takes checkout's red because checkout's stylesheet loads later with the same
specificity. With runtime composition that order can change depending on which remote finishes
downloading first, so this bug can appear and disappear on its own. Inside the shadow root, global
styles don't apply and local styles don't leak, but `font-family` from `body` is still inherited.
Try the same example in jsdom: the color inside the shadow root comes out red too, because jsdom
doesn't model that boundary. That's also a lesson about the limits of your test tools.

**4. (Challenge) An import map as the manifest.** In the browser, `<script type="importmap">` can
replace a hand-rolled manifest:

```html
<script type="importmap">
  { "imports": { "react": "https://esm.sh/react@19.3.1", "@shop/cart": "/cart/2.0.0/index.js" } }
</script>
<script type="module">
  import { mount } from "@shop/cart";
  mount(document.querySelector("#cart"), { items: ["a", "b"] });
</script>
```

Because every MFE imports `react` by the same name, the browser loads only one instance, so the
share scope comes for free as long as everyone agrees on one URL. Try changing the `@shop/cart`
version in the import map without rebuilding anything, then watch the Network tab. This is how
single-spa works with import maps.

Record your results and surprises in the [experiment notes](/en/notes/).

## Practical implications

- **Start from the organizational question, not the technology.** If there aren't several teams
  that must deploy independently, start with a monorepo with clear module boundaries.
- **Cut vertically by domain and by route first.** Composing several MFEs on one page costs far
  more than one MFE per route.
- **Treat `mount(el, props)` and event payloads as a public API:** version them, publish their
  types, validate at runtime, and cover them with contract tests.
- **Share as little as possible.** URL and props first, events when needed, a global store almost
  never.
- **Use singletons for frameworks and stateful libraries** (React, the router, state libraries),
  and agree on their version ranges in one place.
- **Every remote needs a timeout, an error boundary, and a fallback.** A failing remote must not
  take down the whole page.
- **A shared design system and tokens are a prerequisite, not a bonus.** Without them, users see
  five apps stitched into one.
- **Measure before and after:** total JS size, request count, and LCP. Micro-frontend costs show up
  most often in performance.

## Primary sources

- Cam Jackson, [*Micro Frontends*](https://martinfowler.com/articles/micro-frontends.html) (martinfowler.com)
- Michael Geers, [micro-frontends.org](https://micro-frontends.org/) and the book *Micro Frontends in Action*
- Luca Mezzalira, *Building Micro-Frontends* (O'Reilly)
- [webpack: Module Federation](https://webpack.js.org/concepts/module-federation/) and
  [module-federation.io](https://module-federation.io/) (Rspack, Vite, runtime)
- [single-spa](https://single-spa.js.org/) and [MDN: `<script type="importmap">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
- [React: Invalid Hook Call Warning](https://react.dev/warnings/invalid-hook-call-warning) (the "Duplicate React" section)
- [MDN: Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- Melvin Conway, [*How Do Committees Invent?*](https://www.melconway.com/Home/Committees_Paper.html) (1968)
- Martin Fowler, [*StranglerFigApplication*](https://martinfowler.com/bliki/StranglerFigApplication.html)
