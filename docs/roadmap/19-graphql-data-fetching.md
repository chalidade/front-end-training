# 19 · GraphQL & Data Fetching

> **Fase:** 7 · **Estimasi:** 2 minggu · **Prasyarat:** [07 Framework](07-framework.md)

## Kenapa ini penting

Sebagian besar kompleksitas aplikasi front-end adalah **server state**: data yang dimiliki server,
di-cache di client, dan bisa basi. Cara mengambil dan menyimpan data ini lebih menentukan arsitektur
daripada pilihan framework UI.

## Peta konsep

### Dasar
- [ ] REST vs GraphQL vs RPC (tRPC)
- [ ] GraphQL: schema, query, mutation, subscription, fragment
- [ ] Client: Apollo Client, Relay, urql
- [ ] TanStack Query / SWR untuk REST

### Menengah
- [ ] Normalized cache (Apollo, Relay) vs document cache (TanStack Query)
- [ ] Stale-while-revalidate, invalidasi, refetch on focus
- [ ] Optimistic update dan rollback
- [ ] Pagination: offset vs cursor (Relay connection spec)
- [ ] Codegen tipe dari schema

### Deep dive
- [ ] Fragment colocation dan data masking (Relay)
- [ ] Waterfall vs parallel fetching, prefetch di route
- [ ] Persisted queries dan keamanan GraphQL (query depth, cost)
- [ ] Local-first dan sync engine (Replicache, Zero, ElectricSQL)

## Cara belajar

1. Bangun fitur yang sama (list + detail + edit) dengan fetch manual, TanStack Query, dan Apollo. Bandingkan jumlah kodenya dan perilaku cache-nya.
2. Buka devtools TanStack Query/Apollo, lalu amati cache saat navigasi.
3. Implementasikan cursor pagination sesuai Relay connection spec.

## Uji pemahaman

1. Masalah apa yang diselesaikan normalized cache, dan apa biayanya?
2. Kenapa GraphQL rawan N+1 di server, dan bagaimana DataLoader mengatasinya?
3. Kapan GraphQL berlebihan untuk sebuah project?
4. Bagaimana menghindari request waterfall di aplikasi React?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Client GraphQL untuk API publik (misal GitHub GraphQL) | Query, fragment |
| Menengah | Infinite feed dengan optimistic like + rollback | Cache, mutation |
| Deep | Mini query cache: dedup request, stale time, refetch on focus, subscriber | SWR |

## Sumber primer

- [GraphQL spec](https://spec.graphql.org/) dan [graphql.org/learn](https://graphql.org/learn/)
- [TanStack Query docs](https://tanstack.com/query/latest)
- [Relay: Thinking in Relay](https://relay.dev/docs/principles-and-architecture/thinking-in-relay/)

## Toolkit terkait

- Deep dive: [State management: model mental, bukan library](../deep-dives/state-management.md)
- (rencana) `@chalidade/fetch`
