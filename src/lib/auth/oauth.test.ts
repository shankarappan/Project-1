import { describe, expect, it, afterEach } from "vitest";
import { getEnabledAuthMethods, oauthProviderLabel } from "./oauth";

describe("oauth helpers", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AUTH_PROVIDERS;
  });

  it("defaults to magic + google + apple", () => {
    delete process.env.NEXT_PUBLIC_AUTH_PROVIDERS;
    expect(getEnabledAuthMethods()).toEqual({
      magicLink: true,
      oauth: ["google", "apple"],
    });
  });

  it("respects NEXT_PUBLIC_AUTH_PROVIDERS", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDERS = "magic,google";
    expect(getEnabledAuthMethods()).toEqual({
      magicLink: true,
      oauth: ["google"],
    });
  });

  it("labels providers for UI copy", () => {
    expect(oauthProviderLabel("google")).toBe("Google");
    expect(oauthProviderLabel("apple")).toBe("Apple");
  });
});
