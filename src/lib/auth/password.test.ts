import { describe, expect, it } from "vitest";
import { validatePassword } from "./password";

describe("validatePassword", () => {
  it("rejects empty password", () => {
    expect(validatePassword("").code).toBe("empty");
  });

  it("rejects short passwords", () => {
    expect(validatePassword("short").code).toBe("short");
  });

  it("accepts long enough passwords", () => {
    expect(validatePassword("long-enough")).toEqual({
      code: "ok",
      password: "long-enough",
    });
  });
});
