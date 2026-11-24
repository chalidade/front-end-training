import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, parseRetryAfter, TimeoutError } from "./index";

/** fetch palsu: setiap panggilan mengambil hasil berikutnya dari daftar. */
function mockFetch(results: Array<Response | Error | "hang">) {
  const calls: RequestInit[] = [];
  const fn = vi.fn((_input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push(init);
    const next = results.shift();
    if (next === "hang") {
      // Tidak pernah selesai, kecuali dibatalkan lewat signal (seperti fetch asli).
      return new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    }
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next ?? new Response("kosong"));
  });
  return { fn: fn as unknown as typeof fetch, calls, mock: fn };
}

const status = (code: number, headers: Record<string, string> = {}) => new Response(null, { status: code, headers });

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchWithRetry", () => {
  it("mencoba ulang status sementara sampai berhasil", async () => {
    const f = mockFetch([status(503), status(502), new Response("ok")]);
    const promise = fetchWithRetry("/api", { fetch: f.fn });
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(await res.text()).toBe("ok");
    expect(f.mock).toHaveBeenCalledTimes(3);
  });

  it("memakai backoff eksponensial dengan jitter", async () => {
    const f = mockFetch([status(503), status(503), new Response("ok")]);
    const promise = fetchWithRetry("/api", { fetch: f.fn, retryDelay: 100 });
    await vi.advanceTimersByTimeAsync(49); // jeda pertama: 0.5 × 100 × 2^0 = 50 ms
    expect(f.mock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.mock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(100); // jeda kedua: 0.5 × 100 × 2^1 = 100 ms
    expect(f.mock).toHaveBeenCalledTimes(3);
    await promise;
  });

  it("menghormati Retry-After dalam detik", async () => {
    const f = mockFetch([status(429, { "Retry-After": "2" }), new Response("ok")]);
    const promise = fetchWithRetry("/api", { fetch: f.fn });
    await vi.advanceTimersByTimeAsync(1999);
    expect(f.mock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.mock).toHaveBeenCalledTimes(2);
    await promise;
  });

  it("mengembalikan respons terakhir saat percobaan habis", async () => {
    const f = mockFetch([status(503), status(503), status(503)]);
    const promise = fetchWithRetry("/api", { fetch: f.fn });
    await vi.runAllTimersAsync();
    expect((await promise).status).toBe(503);
    expect(f.mock).toHaveBeenCalledTimes(3);
  });

  it("tidak mencoba ulang status yang bukan sementara", async () => {
    const f = mockFetch([status(404)]);
    expect((await fetchWithRetry("/api", { fetch: f.fn })).status).toBe(404);
    expect(f.mock).toHaveBeenCalledTimes(1);
  });

  it("tidak mencoba ulang POST", async () => {
    const f = mockFetch([status(503), new Response("ok")]);
    const res = await fetchWithRetry("/api", { fetch: f.fn, method: "post", body: "{}" });
    expect(res.status).toBe(503);
    expect(f.mock).toHaveBeenCalledTimes(1);
  });

  it("mencoba ulang error jaringan", async () => {
    const f = mockFetch([new TypeError("Failed to fetch"), new Response("ok")]);
    const promise = fetchWithRetry("/api", { fetch: f.fn });
    await vi.runAllTimersAsync();
    expect(await (await promise).text()).toBe("ok");
  });

  it("melempar error yang bukan sementara tanpa retry", async () => {
    const f = mockFetch([new SyntaxError("bukan jaringan")]);
    await expect(fetchWithRetry("/api", { fetch: f.fn })).rejects.toThrow(SyntaxError);
    expect(f.mock).toHaveBeenCalledTimes(1);
  });

  it("melempar TimeoutError per percobaan", async () => {
    const f = mockFetch(["hang", "hang"]);
    const promise = fetchWithRetry("/api", { fetch: f.fn, timeout: 1000, retries: 1 });
    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(f.mock).toHaveBeenCalledTimes(2);
  });

  it("berhenti tanpa retry saat dibatalkan pemanggil", async () => {
    const f = mockFetch(["hang", new Response("tidak boleh dipakai")]);
    const controller = new AbortController();
    const promise = fetchWithRetry("/api", { fetch: f.fn, signal: controller.signal });
    const assertion = expect(promise).rejects.toThrow("pengguna pindah halaman");
    controller.abort(new Error("pengguna pindah halaman"));
    await assertion;
    expect(f.mock).toHaveBeenCalledTimes(1);
  });

  it("berhenti saat dibatalkan di tengah jeda retry", async () => {
    const f = mockFetch([status(503), new Response("ok")]);
    const controller = new AbortController();
    const promise = fetchWithRetry("/api", { fetch: f.fn, signal: controller.signal, retryDelay: 1000 });
    const assertion = expect(promise).rejects.toThrow("batal");
    await vi.advanceTimersByTimeAsync(10);
    controller.abort(new Error("batal"));
    await assertion;
    expect(f.mock).toHaveBeenCalledTimes(1);
  });
});

describe("parseRetryAfter", () => {
  it("membaca detik dan tanggal HTTP", () => {
    const now = Date.parse("2026-11-25T00:00:00Z");
    expect(parseRetryAfter("120")).toBe(120_000);
    expect(parseRetryAfter("Wed, 25 Nov 2026 00:00:30 GMT", now)).toBe(30_000);
    expect(parseRetryAfter("Tue, 24 Nov 2026 23:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter("besok")).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});
