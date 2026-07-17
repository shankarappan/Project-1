import { describe, expect, it, vi, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts sensitive fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("test_event", {
      email: "secret@example.com",
      token: "abc",
      invite: "xyz",
      amount: 12.5,
      groupId: "g1",
    });

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.email).toBe("[redacted]");
    expect(payload.token).toBe("[redacted]");
    expect(payload.invite).toBe("[redacted]");
    expect(payload.amount).toBe("[redacted]");
    expect(payload.groupId).toBe("g1");
  });
});
