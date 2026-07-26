import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./safe-redirect";

describe("getSafeRedirectPath", () => {
  it("allows relative app paths", () => {
    expect(getSafeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectPath("/groups/abc?tab=1")).toBe("/groups/abc?tab=1");
    expect(getSafeRedirectPath("/invite/token#join")).toBe("/invite/token#join");
  });

  it("blocks open redirects", () => {
    expect(getSafeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("http://evil.com/phish")).toBe("/dashboard");
    expect(getSafeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("%2F%2Fevil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("///evil.com")).toBe("/dashboard");
  });

  it("falls back for empty or invalid values", () => {
    expect(getSafeRedirectPath("")).toBe("/dashboard");
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
    expect(getSafeRedirectPath("dashboard")).toBe("/dashboard");
    expect(getSafeRedirectPath("   ")).toBe("/dashboard");
    expect(getSafeRedirectPath("/ok", "/login")).toBe("/ok");
    expect(getSafeRedirectPath("//x", "/login")).toBe("/login");
  });
});
