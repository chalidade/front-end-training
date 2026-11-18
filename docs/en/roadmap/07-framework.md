# 07 · Framework (React & others)

> **Phase:** 3 · **Estimate:** 4–6 weeks · **Prerequisites:** [04 JavaScript](04-javascript.md)

## Why it matters

Frameworks solve one core problem: **keeping the UI in sync with state**. Each framework answers it
differently (virtual DOM, compiler, signals). Master one framework deeply, and understand enough about
the others to judge their trade-offs.

**Recommendation:** React as the main focus (the largest ecosystem and job market). Learn Vue, Angular,
Svelte, Solid, and Qwik for comparison.

## Concept map

### Basics (React)
- [ ] JSX, components, props, state
- [ ] Hooks: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useContext`
- [ ] Rendering lists and `key`
- [ ] Controlled vs uncontrolled forms
- [ ] Routing (react-router / a framework router)

### Intermediate
- [ ] When components re-render, and why `memo` sometimes doesn't help
- [ ] The rules of `useEffect`: dependency arrays, cleanup, "you might not need an effect"
- [ ] State management: local vs lifted vs context vs external store (Zustand, Redux Toolkit)
- [ ] Server state vs client state (TanStack Query)
- [ ] Composition patterns: compound components, render props, headless components
- [ ] Error boundaries, Suspense

### Deep dive
- [ ] Reconciliation and the diffing algorithm
- [ ] The Fiber architecture: work loop, lanes, concurrent rendering, `useTransition`
- [ ] React Server Components and their serialization model
- [ ] React Compiler: auto-memoization
- [ ] Comparing reactivity models: VDOM (React) vs fine-grained signals (Solid, Vue, Angular signals) vs compiler (Svelte)

## How to learn

1. Read [react.dev/learn](https://react.dev/learn) to the end, including *Escape Hatches*.
2. Turn on the React DevTools Profiler and *Highlight updates*, then build an app that re-renders too
   much and fix it.
3. Rewrite the same small feature in React, Vue, Svelte, and Solid. Note the differences in mental model.
4. Build a mini React (see the deep project) **before** reading React's source.
5. Read React's source starting at `packages/react-reconciler/src/ReactFiberWorkLoop.js`.

## Check your understanding

1. Why can `key={index}` cause state bugs in a reorderable list?
2. Why does `useEffect` run twice in development (Strict Mode), and what is it trying to teach you?
3. What happens when a context value changes? How do you stop every consumer from re-rendering?
4. Explain the difference between the *render phase* and the *commit phase*. Why must the render phase be pure?
5. How can signals (Solid) update the DOM without re-running the component function?
6. What does the server send to the client in React Server Components?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | A CRUD app with routing, forms, and fetching | React basics |
| Intermediate | A dashboard with TanStack Query, optimistic updates, and URL state | Server state |
| Deep | **Mini React:** `createElement`, render, reconciliation, `useState`, `useEffect` (follow [Build your own React](https://pomb.us/build-your-own-react/)) | Fiber, reconciliation |
| Deep | A mini signals library (`signal`, `computed`, `effect`) | Fine-grained reactivity |

## Primary sources

- [react.dev](https://react.dev/) and the [React source](https://github.com/facebook/react)
- [Vue: Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [SolidJS docs](https://docs.solidjs.com/), [Svelte docs](https://svelte.dev/docs)
- [Dan Abramov: overreacted.io](https://overreacted.io/)

## Related toolkit

- [`@chalidade/react-hooks`](../toolkit/react-hooks.md): `useDebouncedCallback`, `useThrottledCallback`, `useLatest`, etc.
- Deep dive: [Efficiency in React](../deep-dives/react-efficiency.md), [React Fiber from the source code](../deep-dives/react-fiber.md), [Signals](../deep-dives/signals.md)
- (planned) `@chalidade/ui`: headless + styled components
