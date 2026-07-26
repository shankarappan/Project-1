import { describe, expect, it } from "vitest";
import {
  getAuthErrorMessage,
  mapAuthCallbackError,
  mapMagicLinkSendError,
} from "./callback-errors";

describe("mapAuthCallbackError", () => {
  it("maps expired and used link errors", () => {
    expect(mapAuthCallbackError("Email link is invalid or has expired").code).toBe(
      "expired"
    );
    expect(mapAuthCallbackError("Token has expired or is invalid").code).toBe(
      "expired"
    );
    expect(mapAuthCallbackError("Auth code already used").code).toBe("used");
  });

  it("maps PKCE / different-browser failures", () => {
    expect(
      mapAuthCallbackError("invalid request: both auth code and code verifier should be non-empty").code
    ).toBe("pkce");
    expect(mapAuthCallbackError("PKCE code verifier not found in cookies").code).toBe(
      "pkce"
    );
  });

  it("maps rate limit and network failures", () => {
    expect(mapAuthCallbackError("email rate limit exceeded").code).toBe(
      "rate_limit"
    );
    expect(mapAuthCallbackError("Failed to fetch").code).toBe("network");
  });

  it("never returns raw tokens or opaque supabase dumps for known cases", () => {
    const mapped = mapAuthCallbackError("access_token=secret&refresh_token=secret");
    expect(mapped.message).not.toMatch(/access_token|refresh_token/);
  });
});

describe("getAuthErrorMessage", () => {
  it("resolves known codes", () => {
    expect(getAuthErrorMessage("missing_code")).toMatch(/incomplete or invalid/i);
    expect(getAuthErrorMessage("pkce")).toMatch(/same browser/i);
  });
});

describe("mapMagicLinkSendError", () => {
  it("maps rate limits clearly", () => {
    expect(mapMagicLinkSendError("Email rate limit exceeded")).toMatch(/hour/i);
  });
});
