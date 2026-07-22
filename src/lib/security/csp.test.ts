import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, securityHeaders } from "./csp";

describe("security headers / CSP", () => {
  it("includes required protections and supabase connect origin", () => {
    const csp = buildContentSecurityPolicy({
      supabaseUrl: "https://bdtbqwipwyitqsflvphk.supabase.co",
      nonce: "test-nonce",
      isDev: false,
    });

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://bdtbqwipwyitqsflvphk.supabase.co");
    expect(csp).toContain("wss://bdtbqwipwyitqsflvphk.supabase.co");
    expect(csp).toContain("nonce-test-nonce");
    expect(csp).toContain("strict-dynamic");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https:\*/);
  });

  it("allows unsafe-inline scripts in development", () => {
    const csp = buildContentSecurityPolicy({
      supabaseUrl: "https://example.supabase.co",
      isDev: true,
    });
    expect(csp).toContain("unsafe-inline");
    expect(csp).toContain("unsafe-eval");
  });

  it("sets HSTS and permissions policy in production", () => {
    const headers = securityHeaders({
      supabaseUrl: "https://example.supabase.co",
      nonce: "abc",
      isProduction: true,
    });

    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
    expect(headers["Permissions-Policy"]).toContain("geolocation=()");
    expect(headers["Content-Security-Policy"]).toContain("nonce-abc");
  });
});
