# Deep Dive: Signals, from Knockout to the TC39 Proposal

> Related: [07 Framework](../roadmap/07-framework.md). Other deep dives:
> [React Fiber from the source code](react-fiber.md), [Efficiency in React](react-efficiency.md)

## Opening questions

In React, changing one piece of state re-runs its component, and React then looks for the
differences. In Solid, Vue, Angular, Preact Signals, and Svelte 5, changing one value directly
updates the one DOM node that uses it, without re-running the component function. How does the
library know who uses that value when you never wrote a dependency list? Why can a `computed` end
up never being calculated at all? And why is an idea from 2010 now being proposed for JavaScript
itself?

## Mental model

A signal is **a value that knows who reads it**. There are three roles:

| Role | Example API | Job |
| --- | --- | --- |
| **Source** (state) | `signal(0)`, `ref(0)`, `new Signal.State(0)` | Holds a value and notifies readers when it changes |
| **Derived** (computed) | `computed(() => a.value * 2)` | A cached value computed from other signals |
| **Effect** | `effect(() => el.textContent = …)` | The edge of the graph: touches the outside world (DOM, network) |

Together they form a **dependency graph** that is built automatically as code runs:

```
   firstName ─┐
              ├──► fullName (computed) ──► effect: render <h1>
   lastName ──┘                     ▲
                                    │ read while the effect runs → recorded as a dependency
```

Compare that with React. React doesn't know which part of the UI uses a piece of state, so it
re-runs components and compares the results (see [React Fiber](react-fiber.md)). Signals know
exactly, so nothing needs comparing. The price: you must read values through a getter (`.value`,
`()`, `.get()`) so the read can be tracked.

## Detailed mechanism

### 1. Automatic tracking: a global "who is running" variable

The whole trick is one global variable. Here is a complete mini library you can run:

```js
let current = null; // the computation that is currently running

export function signal(value) {
  const subs = new Set();
  return {
    get value() {
      if (current) { subs.add(current); current.deps.add(subs); } // record the reader
      return value;
    },
    set value(v) {
      if (Object.is(v, value)) return;
      value = v;
      for (const s of [...subs]) s.notify(); // notify the readers
    },
  };
}

export function effect(fn) {
  const run = { deps: new Set(), notify: execute };
  function execute() {
    for (const d of run.deps) d.delete(run); // drop old dependencies
    run.deps.clear();
    const prev = current; current = run;
    try { fn(); } finally { current = prev; }
  }
  execute();
  return () => { for (const d of run.deps) d.delete(run); };
}
```

While an `effect` runs, `current` points to it. Every getter that gets called records `current`
as a reader. When a setter is called, every reader runs again.

Dependencies are rebuilt **on every run**, so they can be dynamic:

```js
const first = signal("Ada"), last = signal("Lovelace"), showFull = signal(true);
effect(() => log(showFull.value ? `${first.value} ${last.value}` : first.value));
last.value = "Byron";    // re-runs: "Ada Byron"
showFull.value = false;  // re-runs: "Ada", and last is no longer read
last.value = "King";     // does NOT re-run
```

This is also the reason for Solid's rule: don't destructure props. `const { name } = props` reads
the value once outside any effect, so nothing gets recorded.

### 2. The glitch problem and "push-then-pull"

The most naive implementation makes `computed` an effect that writes into another signal and runs
every reader immediately on change (pure *push*). On a diamond-shaped graph, the result is wrong:

```
        a
       ╱ ╲
  b = a*2   c = a*3
       ╲ ╱
     effect: b + c
```

Change `a` from 1 to 2 and log every time the effect runs. This is the real output of the naive
version:

```
[ '2+3=5', '4+3=7', '4+6=10' ]
```

`4+3=7` is a **glitch**: the effect saw the new `b` and the old `c`, a state that was never true.
If that effect sends a request or writes to the DOM, the mistake becomes visible.

Modern libraries (Preact Signals, Solid, Vue 3.5+, Angular, and the TC39 proposal) use
**push-then-pull**:

1. **Push (cheap):** when a source changes, a "maybe dirty" notice is pushed to every dependent.
   Nothing is computed yet.
2. **Pull (lazy):** new values are computed only when something reads them. Before computing, a
   computed checks whether its sources really changed (through version numbers or a
   clean/check/dirty state).
3. **Effects are scheduled** and run after the whole graph has been marked. When the effect reads
   `b` and `c`, both are pulled and recomputed from the same `a`.

With `@preact/signals-core`, the same diamond produces `[ '2+3=5', '4+6=10' ]`.

### 3. Three properties that come from pulling

- **Lazy:** a computed that is never read is never computed. After `count` changes twice,
  `double` still hasn't been computed (0 evaluations). Reading `double.value` twice triggers only 1
  evaluation because the result is cached.
- **Equality cut-off:** if a computed produces the same value (`Object.is`), its readers don't
  re-run. With `isOdd = computed(() => n.value % 2 === 1)`, changing `n` from 1 to 3 to 5 doesn't
  re-run an effect that only reads `isOdd`.
- **Batching:** several writes inside `batch(() => { x.value = 1; y.value = 2 })` cause the effect
  to run once, not twice.

### 4. A short history

| Year | Library | Contribution |
| --- | --- | --- |
| 2010 | **Knockout.js** | `ko.observable` and `ko.computed` with automatic *dependency detection*. The core idea is already here. |
| 2012–2015 | Meteor Tracker, **S.js**, **MobX** | Automatic tracking for application state. S.js introduced consistent synchronous updates (no glitches). |
| 2016–2020 | **Vue 2 → Vue 3** | Getters/setters in Vue 2, then `Proxy` and `ref`/`computed`/`effect` in Vue 3 |
| 2018–2021 | **SolidJS** | `createSignal` + a JSX compiler: components run **once**, and only small per-DOM-node effects re-run. The term "signals" catches on. |
| 2022–2024 | **Preact Signals**, **Angular signals** (v16), **Svelte 5 runes**, Qwik | Almost every framework other than React moves to signals |
| 2024 | **TC39 Signals proposal** | Reached Stage 1 in April 2024. The goal is one shared reactive graph core that every framework can use. |

### 5. The TC39 proposal: a core, not a framework

The proposal deliberately does **not** include `effect`. It only provides the graph and a way to
observe it, so each framework can bring its own scheduler:

```js
import { Signal } from "signal-polyfill";

const counter = new Signal.State(0);
const isEven = new Signal.Computed(() => (counter.get() & 1) === 0);
const parity = new Signal.Computed(() => (isEven.get() ? "even" : "odd"));

// a home-made effect: Watcher + microtask
let pending = false;
const w = new Signal.subtle.Watcher(() => {
  if (pending) return;
  pending = true;
  queueMicrotask(() => {
    pending = false;
    for (const s of w.getPending()) s.get();
    w.watch(); // re-arm notifications
  });
});
function effect(cb) {
  const c = new Signal.Computed(cb);
  w.watch(c);
  c.get();
  return () => w.unwatch(c);
}
```

The `Watcher` callback is called **synchronously** when a source is marked dirty, and inside it
you may not read or write signals. Its only job is to schedule. With the `effect` above,
`counter.set(1); counter.set(2); counter.set(3)` done synchronously produces a single
`parity: odd` log in the next microtask, and `counter.set(5)` produces no log at all because
`parity` stays `"odd"`.

`Signal.subtle` is named that way because its contents are for framework authors, not everyday
application code.

## Experiments

All results below were verified with Node 22, `@preact/signals-core@1.14.5`, and
`signal-polyfill@0.2.2`.

1. **Mini signals.** Copy the library from section 1 into `mini.mjs` and run the
   `first`/`last`/`showFull` example. After you add `first.value = "Augusta"` at the end, the result
   should be `['Ada Lovelace', 'Ada Byron', 'Ada', 'Augusta']`.
2. **Create a glitch.** Add an `eagerComputed(fn)` that creates a signal plus an effect that writes
   into it. Build the diamond graph from section 2 and show that `4+3=7` appears.
3. **Fix the glitch.** Run the same graph with `@preact/signals-core`. Then try fixing your own mini
   library: mark dirty first, run effects after everything has been marked, and compute computeds
   only when they're read.
4. **Laziness and cut-off.** Count how many times a `computed` is evaluated when it's never read,
   when it's read twice, and when its result doesn't change.
5. **The TC39 polyfill.** Build an `effect` with `Signal.subtle.Watcher` as in section 5. Try
   reading a signal inside the `notify` callback and note the error.
6. **Solid vs React.** Build the same counter in Solid and React, put `console.log("render")` in the
   component body, and click 5 times. Count how many times the log appears in each.

Record your results and surprises in your [experiment notes](/en/notes/). Experiment 3 is the first
step of the "Mini signals library" practice project in stage 07.

## Practical implications

- **Read values where they're tracked.** Reading a signal outside an effect or computed (for
  example when destructuring props in Solid, or storing `.value` in a variable) breaks reactivity.
- **Derive values with `computed`, not with an effect that writes to another signal.** Effects that
  copy state cause glitches and cascading renders, just like "you might not need an effect" in
  React.
- **Use effects only for the outside world:** DOM, network, storage, logging.
- **Equality cut-off is a feature.** Split a big computed into several small ones whose results
  rarely change, so the branches below them can stop early.
- **Mutated objects aren't detected.** `list.value.push(x)` triggers nothing because the identity is
  the same. Assign a new value (`list.value = [...list.value, x]`) or use a `Proxy`-based store such
  as Vue's `reactive()`.
- **Signals vs VDOM isn't about which is faster in every case.** Signals win for small, frequent
  updates. A VDOM is simpler to reason about ("UI = f(state)"), and the React Compiler reduces the
  cost of re-rendering. Understand both.

## Primary sources

- [TC39 Signals proposal](https://github.com/tc39/proposal-signals) and
  [`signal-polyfill`](https://github.com/proposal-signals/signal-polyfill)
- [Knockout: Computed observables](https://knockoutjs.com/documentation/computedObservables.html)
  and [How dependency tracking works](https://knockoutjs.com/documentation/computed-dependency-tracking.html)
- [S.js](https://github.com/adamhaile/S)
- [SolidJS: Fine-grained reactivity](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity)
- Ryan Carniato, [*A Hands-on Introduction to Fine-Grained Reactivity*](https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf)
- [Preact: Introducing Signals](https://preactjs.com/blog/introducing-signals/) and the
  [`@preact/signals-core` source](https://github.com/preactjs/signals/tree/main/packages/core)
- [Vue: Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Angular: Signals](https://angular.dev/guide/signals)
- [Svelte 5: Runes](https://svelte.dev/docs/svelte/what-are-runes)
