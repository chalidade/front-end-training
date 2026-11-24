# @chalidade/fetch

`fetch` with a per-attempt timeout and retries for transient failures. No dependencies, about 100
lines, and deliberately written to be readable.

```bash
pnpm add @chalidade/fetch
# or
npm install @chalidade/fetch
```

::: warning Not published yet
This package hasn't been published to npm yet. For now, copy its source from
[GitHub](https://github.com/chalidade/front-end-training/tree/main/packages/fetch/src).
:::

## Why not just `fetch`?

Built-in `fetch` has no timeout: a request to a stuck server can hang until the browser gives up,
which can take minutes. `fetch` also never retries, even though on mobile networks many failures are
only temporary (a brief disconnect, a 503 during a deploy, a 429 under rate limiting). Writing
retries yourself looks easy, but there are a few traps:

- **Retrying a POST** can create a duplicate order. Only idempotent methods are safe to repeat.
- **Simultaneous retries** from thousands of clients after a server recovers can knock it over again
  (a *thundering herd*). Delays have to be randomized (*jitter*), not fixed.
- **The server already said when to come back** with the `Retry-After` header. Ignore it and you
  extend your own rate limit.
- **User cancellation** (navigating away, retyping a search) must not trigger a retry.

## API

### `fetchWithRetry(input, options?)`

Same signature as `fetch`, plus a few options:

| Option | Default | Meaning |
| --- | --- | --- |
| `timeout` | `10000` | time limit **per attempt** in ms; `0` disables it |
| `retries` | `2` | number of retries after the first attempt |
| `retryDelay` | `300` | backoff base; the n-th delay is random between 0 and `retryDelay × 2ⁿ` ms |
| `maxDelay` | `10000` | upper bound for delays, including from `Retry-After` |
| `retryOn` | `[408, 425, 429, 500, 502, 503, 504]` | HTTP statuses to retry |
| `retryMethods` | `["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]` | methods that may be retried |
| `fetch` | `globalThis.fetch` | the fetch implementation, useful for tests |

```ts
import { fetchWithRetry, TimeoutError } from "@chalidade/fetch";

const controller = new AbortController();

try {
  const res = await fetchWithRetry("/api/products?q=shoes", {
    timeout: 5000,
    retries: 3,
    signal: controller.signal, // controller.abort() stops the request and any retry delay
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  render(await res.json());
} catch (error) {
  if (error instanceof TimeoutError) showToast("The server is slow, try again shortly");
  else if (controller.signal.aborted) return; // cancelled on purpose, ignore
  else throw error;
}
```

How it behaves:

1. Each attempt gets its own `AbortController`. The timeout aborts it with a `TimeoutError`; your
   `signal` is forwarded to it.
2. Network errors (`TypeError` from `fetch`) and `TimeoutError` count as transient and are retried.
   Any other error is thrown right away.
3. Statuses in `retryOn` are retried. Once attempts run out, **the last response is returned**,
   exactly like `fetch`. You still check `res.ok`.
4. Delays use `Retry-After` (seconds or an HTTP date) when the server sends it. Otherwise,
   exponential backoff with *full jitter*.
5. If your `signal` is aborted, whether during a request or while waiting out a delay, the promise
   rejects immediately with `signal.reason` and there is no retry.
6. Requests whose body is a `ReadableStream` are never retried, because a stream can only be read
   once.

### `TimeoutError`

Thrown when one attempt exceeds `timeout`. Has a `timeout` property (ms). Its message is in
Indonesian, like the rest of this repo's source.

### `parseRetryAfter(value, now?)` and `delayFor(attempt, base, max, response?)`

Helpers exported so they can be reused and tested: `parseRetryAfter("120")` → `120000`,
`parseRetryAfter("Wed, 25 Nov 2026 00:00:30 GMT")` → ms until that time.

## Deliberately left out

- **Token refresh.** A refresh queue for many parallel requests is the "Deep" practice project in
  [14 Authentication](/en/roadmap/14-authentication). Try building it on top of this package.
- **Caching and dedup.** That's the job of server-state libraries like TanStack Query. See the
  [State management deep dive](/en/deep-dives/state-management).
- **Throwing on non-2xx statuses.** To stay compatible with `fetch`.

## Related concepts

[14 Authentication](/en/roadmap/14-authentication), [19 GraphQL & Data Fetching](/en/roadmap/19-graphql-data-fetching),
the [Front-end observability deep dive](/en/deep-dives/observability) (measuring failed requests),
and [HTTP Caching](/en/deep-dives/http-caching).

## Learn from the source

Suggested exercise: read
[`fetchWithRetry.ts`](https://github.com/chalidade/front-end-training/blob/main/packages/fetch/src/fetchWithRetry.ts),
then answer these three questions before looking at the tests. Why is `signal.aborted` checked
**before** `isTransient`? What happens if you remove `Math.random()` from `delayFor` and 10,000
clients fail at the same time? Why may `PUT` be retried but not `PATCH`?
