import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, securityHeaders } from "./csp";

describe("security headers / CSP", () => {
  it("includes required protections and supabase connect origin", () => {
    const csp = buildContentSecurityPolicy({
      supabaseUrl: "https://bdtbqwipwyitqsflvphk.supabase.co",
    });

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://bdtbqwipwyitqsflvphk.supabase.co");
    expect(csp).toContain("wss://bdtbqwipwyitqsflvphk.supabase.co");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https:\*/);
  });

  it("sets HSTS and permissions policy in production", () => {
    const headers = securityHeaders({
      supabaseUrl: "https://example.supabase.co",
      isProduction: true,
    });

    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
    expect(headers["Permissions-Policy"]).toContain("geolocation=()");
  });
});
