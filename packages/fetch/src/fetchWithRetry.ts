export interface FetchWithRetryOptions extends RequestInit {
  /** Batas waktu per percobaan dalam ms. Default 10000. `0` mematikan timeout. */
  timeout?: number;
  /** Jumlah percobaan ulang setelah percobaan pertama. Default 2. */
  retries?: number;
  /** Dasar jeda backoff dalam ms. Jeda ke-n diacak antara 0 dan `retryDelay * 2^n`. Default 300. */
  retryDelay?: number;
  /** Jeda maksimum dalam ms, termasuk dari header `Retry-After`. Default 10000. */
  maxDelay?: number;
  /** Status HTTP yang layak dicoba ulang. */
  retryOn?: readonly number[];
  /** Metode yang aman dicoba ulang. POST dan PATCH tidak termasuk karena tidak idempoten. */
  retryMethods?: readonly string[];
  /** Implementasi fetch yang dipakai. Default `globalThis.fetch`. Berguna untuk test. */
  fetch?: typeof fetch;
}

/** Dilempar saat satu percobaan melewati `timeout`. */
export class TimeoutError extends Error {
  override name = "TimeoutError";
  constructor(readonly timeout: number) {
    super(`Request melewati batas waktu ${timeout} ms`);
  }
}

const DEFAULT_RETRY_ON = [408, 425, 429, 500, 502, 503, 504];
const DEFAULT_RETRY_METHODS = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"];

/**
 * `fetch` dengan timeout per percobaan dan retry untuk kegagalan sementara: error jaringan,
 * timeout, dan status seperti 429/503. Hanya metode idempoten yang dicoba ulang. Seperti `fetch`,
 * respons non-2xx dikembalikan apa adanya setelah percobaan habis, bukan dilempar.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    timeout = 10_000,
    retries = 2,
    retryDelay = 300,
    maxDelay = 10_000,
    retryOn = DEFAULT_RETRY_ON,
    retryMethods = DEFAULT_RETRY_METHODS,
    fetch: doFetch = globalThis.fetch,
    signal,
    ...init
  } = options;

  const method = (init.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  // Body berupa stream hanya bisa dibaca sekali, jadi tidak bisa dikirim ulang.
  const canRetry = retryMethods.includes(method) && !(init.body instanceof ReadableStream);
  const maxAttempts = canRetry ? retries + 1 : 1;

  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    const isLast = attempt + 1 >= maxAttempts;
    try {
      const response = await attemptOnce(doFetch, input, init, timeout, signal);
      if (isLast || !retryOn.includes(response.status)) return response;
      await sleep(delayFor(attempt, retryDelay, maxDelay, response), signal);
    } catch (error) {
      // Dibatalkan oleh pemanggil: jangan coba ulang.
      if (signal?.aborted) throw signal.reason;
      if (isLast || !isTransient(error)) throw error;
      await sleep(delayFor(attempt, retryDelay, maxDelay), signal);
    }
  }
}

async function attemptOnce(
  doFetch: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeout: number,
  outer: AbortSignal | null | undefined,
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", onAbort, { once: true });
  const timer = timeout > 0 ? setTimeout(() => controller.abort(new TimeoutError(timeout)), timeout) : undefined;
  try {
    return await doFetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    // fetch melempar AbortError generik; kembalikan alasan aslinya (TimeoutError atau alasan pemanggil).
    throw controller.signal.aborted ? controller.signal.reason : error;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onAbort);
  }
}

/** Error jaringan (`TypeError` dari fetch) dan timeout dianggap sementara. */
function isTransient(error: unknown): boolean {
  return error instanceof TimeoutError || error instanceof TypeError;
}

/** Jeda sebelum percobaan berikutnya: `Retry-After` kalau ada, kalau tidak backoff eksponensial dengan full jitter. */
export function delayFor(attempt: number, base: number, max: number, response?: Response): number {
  const retryAfter = response ? parseRetryAfter(response.headers.get("Retry-After")) : undefined;
  if (retryAfter !== undefined) return Math.min(retryAfter, max);
  return Math.min(Math.random() * base * 2 ** attempt, max);
}

/** `Retry-After` bisa berupa jumlah detik (`"120"`) atau tanggal HTTP. Hasil dalam ms. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

function sleep(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
