import { describe, expect, it } from "vitest";
import {
  buildCsp,
  buildPermissionsPolicy,
  createNonce,
  securityHeaders,
  strictCsp,
  toHeaderList,
} from "./index";

describe("buildCsp", () => {
  it("menyusun directive, melewati false/undefined, dan menulis true tanpa nilai", () => {
    expect(
      buildCsp({
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https://cdn.example.com"],
        "upgrade-insecure-requests": true,
        "script-src": false,
        "style-src": undefined,
      }),
    ).toBe("default-src 'self'; img-src 'self' data: https://cdn.example.com; upgrade-insecure-requests");
  });

  it("menolak keyword tanpa kutip, karena `self` berarti host bernama self", () => {
    expect(() => buildCsp({ "default-src": ["self"] })).toThrow(/'self'/);
    expect(() => buildCsp({ "script-src": ["nonce-abc"] })).toThrow(/dikutip/);
    expect(() => buildCsp({ "script-src": ["sha256-xyz="] })).toThrow(/dikutip/);
  });

  it("menolak source yang bisa menyuntik directive lain", () => {
    expect(() => buildCsp({ "img-src": ["https://a.com; script-src *"] })).toThrow(/spasi/);
    expect(() => buildCsp({ "img-src": ["a.com,b.com"] })).toThrow(/spasi/);
  });

  it("menolak daftar kosong dan nama directive yang salah ketik", () => {
    expect(() => buildCsp({ "script-src": [] })).toThrow(/'none'/);
    expect(() => buildCsp({ scriptSrc: ["'self'"] })).toThrow(/tidak valid/);
  });
});

describe("strictCsp", () => {
  it("menghasilkan CSP berbasis nonce dan bisa ditambah", () => {
    const csp = buildCsp(strictCsp("abc123==", { "report-uri": ["/csp-report"] }));
    expect(csp).toBe(
      "script-src 'nonce-abc123==' 'strict-dynamic' https: 'unsafe-inline'; object-src 'none'; " +
        "base-uri 'none'; frame-ancestors 'none'; report-uri /csp-report",
    );
  });

  it("menolak nonce yang bisa merusak header", () => {
    expect(() => strictCsp("abc' 'unsafe-eval")).toThrow(/base64/);
  });
});

describe("createNonce", () => {
  it("menghasilkan 16 byte base64 yang berbeda setiap kali", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(a).not.toBe(b);
    expect(() => strictCsp(a)).not.toThrow();
  });
});

describe("buildPermissionsPolicy", () => {
  it("mengutip origin tapi tidak self/*", () => {
    expect(
      buildPermissionsPolicy({ camera: [], geolocation: ["self", "https://maps.example.com"], fullscreen: ["*"] }),
    ).toBe('camera=(), geolocation=(self "https://maps.example.com"), fullscreen=(*)');
  });
});

describe("securityHeaders", () => {
  it("memberi default yang aman", () => {
    expect(securityHeaders()).toEqual({
      "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Opener-Policy": "same-origin",
    });
  });

  it("bisa mengganti dan mematikan header satu per satu", () => {
    const headers = securityHeaders({
      csp: { "default-src": ["'self'"] },
      cspReportOnly: true,
      hsts: false,
      frameOptions: false,
      coop: false,
      permissionsPolicy: false,
      referrerPolicy: "no-referrer",
    });
    expect(headers).toEqual({
      "Content-Security-Policy-Report-Only": "default-src 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
  });

  it("HSTS preload hanya kalau syaratnya terpenuhi", () => {
    expect(securityHeaders({ hsts: { preload: true } })["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(() => securityHeaders({ hsts: { preload: true, maxAge: 86400 } })).toThrow(/31536000/);
    expect(() => securityHeaders({ hsts: { preload: true, includeSubDomains: false } })).toThrow(/includeSubDomains/);
    expect(() => securityHeaders({ hsts: { maxAge: -1 } })).toThrow(/maxAge/);
  });
});

describe("toHeaderList", () => {
  it("mengubah objek ke bentuk next.config headers()", () => {
    expect(toHeaderList({ "X-Content-Type-Options": "nosniff" })).toEqual([
      { key: "X-Content-Type-Options", value: "nosniff" },
    ]);
  });
});
