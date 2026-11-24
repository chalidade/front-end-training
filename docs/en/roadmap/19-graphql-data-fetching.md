# 19 · GraphQL & Data Fetching

> **Phase:** 7 · **Estimate:** 2 weeks · **Prerequisites:** [07 Framework](07-framework.md)

## Why it matters

Most of the complexity in a front-end app is **server state**: data owned by the server, cached on the
client, and able to go stale. How you fetch and store this data shapes your architecture more than
your choice of UI framework.

## Concept map

### Basics
- [ ] REST vs GraphQL vs RPC (tRPC)
- [ ] GraphQL: schema, queries, mutations, subscriptions, fragments
- [ ] Clients: Apollo Client, Relay, urql
- [ ] TanStack Query / SWR for REST

### Intermediate
- [ ] Normalized cache (Apollo, Relay) vs document cache (TanStack Query)
- [ ] Stale-while-revalidate, invalidation, refetch on focus
- [ ] Optimistic updates and rollback
- [ ] Pagination: offset vs cursor (the Relay connection spec)
- [ ] Generating types from the schema

### Deep dive
- [ ] Fragment colocation and data masking (Relay)
- [ ] Waterfall vs parallel fetching, prefetching on routes
- [ ] Persisted queries and GraphQL security (query depth, cost)
- [ ] Local-first and sync engines (Replicache, Zero, ElectricSQL)

## How to learn

1. Build the same feature (list + detail + edit) with manual fetch, TanStack Query, and Apollo. Compare the amount of code and the caching behavior.
2. Open the TanStack Query/Apollo devtools and watch the cache as you navigate.
3. Implement cursor pagination following the Relay connection spec.

## Check your understanding

1. What problem does a normalized cache solve, and what does it cost?
2. Why is GraphQL prone to N+1 on the server, and how does DataLoader fix it?
3. When is GraphQL overkill for a project?
4. How do you avoid request waterfalls in a React app?

## Practice projects

| Level | Project | What it trains |
| --- | --- | --- |
| Basic | A GraphQL client for a public API (e.g. the GitHub GraphQL API) | Queries, fragments |
| Intermediate | An infinite feed with optimistic likes + rollback | Cache, mutations |
| Deep | A mini query cache: request dedup, stale time, refetch on focus, subscribers | SWR |

## Primary sources

- [GraphQL spec](https://spec.graphql.org/) and [graphql.org/learn](https://graphql.org/learn/)
- [TanStack Query docs](https://tanstack.com/query/latest)
- [Relay: Thinking in Relay](https://relay.dev/docs/principles-and-architecture/thinking-in-relay/)

## Related toolkit

- Deep dive: [State management: mental models, not libraries](../deep-dives/state-management.md)
- [`@chalidade/fetch`](../toolkit/fetch.md): `fetchWithRetry` with timeouts and retries
