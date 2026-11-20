# Deep Dive: State Management, Mental Models, Not Libraries

> Related: [07 Framework](../roadmap/07-framework.md), [19 GraphQL & Data Fetching](../roadmap/19-graphql-data-fetching.md).
> Other deep dives: [Signals](signals.md), [Efficiency in React](react-efficiency.md),
> [React Fiber](react-fiber.md)

## Opening questions

Redux, Zustand, Jotai, MobX, Valtio, XState, TanStack Query, Context. Every year brings a new state
library, and every debate ends with "it depends". Depends on what, exactly? Why can moving one value
from Context to Zustand make an app feel faster? Why can `isLoading` and `isError` both be `true`?
And why shouldn't API data live in the same store as whether a modal is open?

## Mental model

Almost all state management is a variation on three questions:

1. **Where is the state stored?** Inside a component (`useState`), at the top of the tree
   (Context), or outside React (an external store).
2. **Who gets notified when it changes?** Every consumer, or only those reading the part that
   changed.
3. **Who owns the truth?** The browser (UI state), the URL, or the server (state we only hold a
   temporary copy of).

Before picking a library, sort your state into groups:

| Kind | Example | Owner of the truth | Good fit |
| --- | --- | --- | --- |
| **Local UI** | open/closed, hover | the component | `useState`, `useReducer` |
| **Shared UI** | theme, sidebar, cart before checkout | the app | Context (rarely changes), external store (changes often) |
| **URL** | filters, page, active tab | the address bar | the router, `URLSearchParams` |
| **Form** | field values, errors, touched | the form | React Hook Form, `<form>` + actions |
| **Server** | user list, product detail | **the server** | TanStack Query, SWR, Apollo, Relay |
| **Derived** | total price, filtered list | computed from other state | **don't store it**, compute during render |

The most expensive mistakes are usually in the last two rows: keeping **server state** in a global
store as if we owned it, and storing **derived state** so it has to be kept in sync with its source
by hand.

## Detailed mechanism

### 1. The core of every store: state, subscribe, snapshot

Strip away the APIs and names, and almost every external store (Redux, Zustand, Jotai under the
hood) has the same shape:

```ts
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: Partial<T>) {
      state = { ...state, ...next }; // a new object: the change is detectable with ===
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
```

React connects a store like this through `useSyncExternalStore(subscribe, getSnapshot)`. Every time
a listener fires, React calls `getSnapshot()` and compares the result with `Object.is`. If it's the
same, the component does **not** re-render. That is the whole secret of *selectors*:

```ts
function useStore<T, S>(store: Store<T>, selector: (s: T) => S) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}

const count = useStore(store, (s) => s.count); // re-renders only when count changes
```

The hook also solves *tearing*: with concurrent rendering, React can pause a render halfway. If the
store changes during the pause, some components could show the old value and others the new one.
`useSyncExternalStore` detects that and re-renders synchronously.

### 2. Why Context is not state management

Context is a **dependency injection mechanism**, not a store. It has no selectors: every component
that calls `useContext(Ctx)` re-renders when `value` changes by `Object.is`, even if that component
reads only a field that didn't change. Experiment 1 shows the numbers.

Context is still a good choice for values that **rarely change** (theme, locale, the signed-in
user, the store instance itself). For values that change often and are read by many components,
split the Context per value, or move it to a store with selectors.

### 3. Three families of models

| Model | Examples | How it works | Update granularity |
| --- | --- | --- | --- |
| **Single store + selectors** | Redux Toolkit, Zustand | one immutable object, updated via actions/setters | as fine as the selector |
| **Atoms** | Jotai, Recoil, nanostores | many small pieces of state; derived atoms form a graph | per atom |
| **Proxies / signals** | MobX, Valtio, Preact Signals | mutate directly; reads are tracked automatically | per property read |

All three answer question 2 differently. A single store makes you write selectors. Atoms make
granularity the default because each atom has its own subscribers. Proxies and signals track which
properties are read during render, so no selectors are needed at all (the mechanism is covered in
the [Signals](signals.md) deep dive). The price: the more automatic the tracking, the harder it is
to see **why** something re-rendered.

One thing is the same for all three: **changes must be detectable**. Immutable stores detect them
through a new reference (`===`); proxies and signals by intercepting writes. Mutating an object in
an immutable store directly (`state.items.push(x)`) goes undetected, and the UI stays silent.

### 4. Snapshots must be stable

A consequence of the `Object.is` comparison: `getSnapshot` must return **exactly the same** value as
long as the store hasn't changed. A selector that builds a new object on every call
(`(s) => ({ count: s.count })`) makes React think the store is always changing. The result isn't
just extra renders but an infinite loop (Experiment 2). The fix: return primitives, use several
separate selectors, or memoize the selector's result (`useShallow` in Zustand, `createSelector` in
Reselect).

### 5. Impossible states and state machines

The shape of your state decides which bugs are possible. Three independent booleans (`isLoading`,
`isError`, `isSuccess`) have 2³ = 8 combinations, yet only four are meaningful. The rest, like
loading and error at the same time, are bugs waiting to happen.

A discriminated union makes impossible states **unwritable**:

```ts
type Remote<T> =
  | { status: "idle" }
  | { status: "loading"; data?: T }
  | { status: "success"; data: T }
  | { status: "error"; error: string; data?: T };
```

The next step is to restrict **transitions**: an `OK` event only means something while the status
is `loading`. That's the idea behind state machines (XState, or just `useReducer` with a
`switch`). A response that arrives late, after a newer request has started, can't overwrite a
newer result.

### 6. Server state is a cache, not state

API data isn't yours. All you have is a **copy that can go stale**. So the problems differ from UI
state: deduplicating identical requests, deciding when data is stale (*stale time*), when to drop it
(*garbage collection*), refetching when the tab regains focus, invalidating after a mutation, and
optimistic updates with rollback.

Server-state libraries (TanStack Query, SWR, Apollo, Relay) are **keyed caches**: `fetch` results
are stored per key (`["user", 1]`), components subscribe to that key, and the library manages its
lifecycle. Once server state moves there, the global store usually shrinks dramatically, and often
the remaining UI state is handled fine by `useState` and Context.

## Experiments

Experiments 1 and 2 run with React 19.3.1 in vitest + jsdom (put them in
`packages/react-hooks/src/` and run `npx vitest run <file>`). Experiments 3 and 4 only need Node.
All output below is real.

**1. Counting renders: a store with selectors vs Context.** Two components, one reading `count`,
one reading `theme`. Then `count` changes twice.

```tsx
const renders: Record<string, number> = {};
const bump = (k: string) => (renders[k] = (renders[k] ?? 0) + 1);

// Store + selectors
const store = createStore({ count: 0, theme: "light" });
function Count() { bump("store:Count"); return <p>{useStore(store, (s) => s.count)}</p>; }
function Theme() { bump("store:Theme"); return <p>{useStore(store, (s) => s.theme)}</p>; }
render(<><Count /><Theme /></>);
act(() => store.set({ count: 1 }));
act(() => store.set({ count: 2 }));

// Context
const Ctx = createContext({ count: 0, theme: "light" });
let setCtx!: (v: { count: number; theme: string }) => void;
function Provider({ children }: { children: React.ReactNode }) {
  const [v, set] = useState({ count: 0, theme: "light" });
  setCtx = set;
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
function CCount() { bump("ctx:Count"); return <p>{useContext(Ctx).count}</p>; }
function CTheme() { bump("ctx:Theme"); return <p>{useContext(Ctx).theme}</p>; }
const Static = () => <><CCount /><CTheme /></>;
render(<Provider><Static /></Provider>); // children are created outside Provider
act(() => setCtx({ count: 1, theme: "light" }));
act(() => setCtx({ count: 2, theme: "light" }));

console.log(renders);
```

```
{ 'store:Count': 3, 'store:Theme': 1, 'ctx:Count': 3, 'ctx:Theme': 3 }
```

With a selector, `Theme` renders only once (on mount). With Context, `CTheme` renders every time
`count` changes, even though `theme` never changes. Note that `children` are deliberately created
outside `Provider`, so `CTheme` re-renders purely because of `useContext`, not because of its
parent. With two components the difference is small; with 500 table rows each reading the Context,
you feel it.

**2. An unstable snapshot.** A selector that returns a new object:

```tsx
function Bad() {
  const v = useStore(store, (s) => ({ count: s.count })); // a new object on every call
  return <p>{v.count}</p>;
}
render(<Bad />);
```

```
console.error: The result of getSnapshot should be cached to avoid an infinite loop
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState ...
```

React warns first, then gives up. Change the selector to `(s) => s.count` and the error is gone.

**3. Boolean flags vs a discriminated union.**

```js
// Boolean model
let s = { isLoading: false, isError: false, data: null };
const startFetch = () => (s = { ...s, isLoading: true });           // forgot to reset isError
const fail = () => (s = { ...s, isLoading: false, isError: true });
fail(); startFetch();
console.log("boolean:", s);

// Union model + restricted transitions
let u = { status: "idle" };
const transition = (state, event) => {
  switch (event.type) {
    case "FETCH": return { status: "loading", data: state.data };     // keep showing old data
    case "OK": return state.status === "loading" ? { status: "success", data: event.data } : state;
    case "FAIL": return state.status === "loading" ? { status: "error", error: event.error, data: state.data } : state;
    default: return state;
  }
};
for (const e of [{ type: "FETCH" }, { type: "FAIL", error: "timeout" }, { type: "FETCH" },
  { type: "OK", data: [1, 2] }, { type: "FAIL", error: "late" }])
  console.log(e.type.padEnd(5), "→", JSON.stringify((u = transition(u, e))));
```

```
boolean: { isLoading: true, isError: true, data: null }
FETCH → {"status":"loading"}
FAIL  → {"status":"error","error":"timeout"}
FETCH → {"status":"loading"}
OK    → {"status":"success","data":[1,2]}
FAIL  → {"status":"success","data":[1,2]}
```

The boolean model produces "loading and error at once" because of a single forgotten line. The
union model can't express that combination, and the late `FAIL` (last line) is ignored because the
status is no longer `loading`.

**4. A mini query cache: dedup and stale time.** The core of TanStack Query in about 20 lines.

```js
const cache = new Map(); // key → { data, updatedAt, promise }
let calls = 0;
const fetcher = (id) => new Promise((r) => setTimeout(() => r({ id, name: `user ${id}`, call: ++calls }), 20));

function query(key, fn, { staleTime = 0 } = {}) {
  const entry = cache.get(key) ?? {};
  const fresh = entry.updatedAt !== undefined && Date.now() - entry.updatedAt < staleTime;
  if (fresh) return Promise.resolve({ data: entry.data, from: "cache (fresh)" });
  if (entry.promise) return entry.promise.then((data) => ({ data, from: "dedup" }));
  const promise = fn().then((data) => {
    cache.set(key, { data, updatedAt: Date.now() });
    return data;
  });
  cache.set(key, { ...entry, promise });
  return promise.then((data) => ({ data, from: "network" }));
}

const opts = { staleTime: 100 };
const r = await Promise.all([1, 2, 3].map(() => query("user:1", () => fetcher(1), opts)));
console.log(r.map((x) => `${x.from} call#${x.data.call}`));
console.log((await query("user:1", () => fetcher(1), opts)).from);
await new Promise((ok) => setTimeout(ok, 120));
const late = await query("user:1", () => fetcher(1), opts);
console.log(late.from, "call#" + late.data.call, "| total request:", calls);
```

```
[ 'network call#1', 'dedup call#1', 'dedup call#1' ]
cache (fresh)
network call#2 | total request: 2
```

Three components asking for `user:1` at the same time trigger just one request. The next request
within 100 ms is served from the cache, and only after the data goes stale does it hit the network
again. This version always waits for the network when data is stale; TanStack Query returns the old
data first and refreshes in the background (*stale-while-revalidate*). That's the next challenge,
and the starting point for the "Mini query cache" practice project in stage 19.

Record your results and surprises in the [experiment notes](/en/notes/).

## Practical implications

- **Classify first, pick a library later.** Separate server state, URL state, form state, and UI
  state. What's left for "state management" is often much smaller than you expected.
- **Don't store derived state.** Compute it during render; memoize only when it's measurably
  expensive.
- **Use TanStack Query/SWR (or router loaders) for server data**, not `useEffect` + a global store.
  Dedup, caching, and race conditions are handled for you.
- **Put shareable state in the URL:** filters, search, page, tab. You get bookmarks, the back
  button, and shareable links for free.
- **Context for values that rarely change;** a store with selectors for values that change often
  and are read by many components.
- **Selectors must return stable values.** A new object on every call means constant re-renders, or
  a loop.
- **Model status as a union, not a pile of booleans,** and restrict which transitions are allowed.

## Primary sources

- [React: `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) and
  [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
  (avoid redundant and contradictory state)
- [Redux: Three Principles](https://redux.js.org/understanding/thinking-in-redux/three-principles)
  and [Deriving Data with Selectors](https://redux.js.org/usage/deriving-data-selectors)
- [Zustand](https://zustand.docs.pmnd.rs/), [Jotai](https://jotai.org/),
  [MobX: The gist](https://mobx.js.org/the-gist-of-mobx.html)
- [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
  and Dominik Dorfmeister, [*React Query as a State Manager*](https://tkdodo.eu/blog/react-query-as-a-state-manager)
- [XState docs](https://stately.ai/docs) and David Khourshid,
  [*No, disabling a button is not app logic*](https://dev.to/davidkpiano/no-disabling-a-button-is-not-app-logic-598i)
- Kent C. Dodds, [*Stop using isLoading booleans*](https://kentcdodds.com/blog/stop-using-isloading-booleans)
- [React 18 Working Group: What is tearing?](https://github.com/reactwg/react-18/discussions/69)
