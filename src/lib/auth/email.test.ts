import { describe, expect, it } from "vitest";
import {
  isEmailRateLimitError,
  mapAuthServiceError,
  validateEmail,
} from "./email";

describe("validateEmail", () => {
  it("rejects empty email", () => {
    expect(validateEmail("").code).toBe("empty");
    expect(validateEmail("   ").message).toMatch(/enter your email/i);
  });

  it("rejects invalid format", () => {
    expect(validateEmail("not-an-email").code).toBe("invalid");
    expect(validateEmail("a@b").code).toBe("invalid");
  });

  it("accepts a normal email", () => {
    expect(validateEmail("you@example.com")).toEqual({
      code: "ok",
      email: "you@example.com",
    });
  });
});

describe("isEmailRateLimitError", () => {
  it("detects Supabase email rate limit wording", () => {
    expect(isEmailRateLimitError("email rate limit exceeded")).toBe(true);
    expect(isEmailRateLimitError("Rate limit exceeded")).toBe(true);
    expect(isEmailRateLimitError("invalid login credentials")).toBe(false);
  });
});

describe("mapAuthServiceError", () => {
  it("maps email rate limiting with a clear wait message", () => {
    expect(mapAuthServiceError("email rate limit exceeded")).toMatch(
      /60 minutes|google\/apple/i
    );
  });

  it("maps rate limiting", () => {
    expect(mapAuthServiceError("Rate limit exceeded")).toMatch(
      /60 minutes|too many/i
    );
  });

  it("maps network failures", () => {
    expect(mapAuthServiceError("Failed to fetch")).toMatch(/connection/i);
  });

  it("maps generic auth failures without leaking internals", () => {
    expect(mapAuthServiceError("SMTP provider exploded")).toMatch(/magic link/i);
  });
});
