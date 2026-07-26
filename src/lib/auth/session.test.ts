import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./safe-redirect";
import { mapAuthCallbackError } from "./callback-errors";

/**
 * Session persistence behaviours that must hold around magic-link callback:
 * - only safe relative redirects are accepted
 * - used/expired/PKCE failures map to actionable codes (links stay single-use)
 */
describe("session callback contract", () => {
  it("keeps post-login redirects in-app", () => {
    expect(getSafeRedirectPath("/groups/123")).toBe("/groups/123");
    expect(getSafeRedirectPath("//attacker.example")).toBe("/dashboard");
  });

  it("documents single-use magic link failure modes", () => {
    expect(mapAuthCallbackError("Auth code already used").code).toBe("used");
    expect(mapAuthCallbackError("Email link is invalid or has expired").code).toBe(
      "expired"
    );
    expect(
      mapAuthCallbackError("both auth code and code verifier should be non-empty")
        .code
    ).toBe("pkce");
  });
});
