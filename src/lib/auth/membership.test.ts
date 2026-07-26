import { describe, expect, it } from "vitest";
import { canPerformOwnerAction } from "./membership";

describe("canPerformOwnerAction", () => {
  it("allows admins and group creators", () => {
    expect(
      canPerformOwnerAction({
        role: "admin",
        userId: "u1",
        groupCreatedBy: "other",
      })
    ).toBe(true);

    expect(
      canPerformOwnerAction({
        role: "member",
        userId: "u1",
        groupCreatedBy: "u1",
      })
    ).toBe(true);
  });

  it("denies ordinary members", () => {
    expect(
      canPerformOwnerAction({
        role: "member",
        userId: "u1",
        groupCreatedBy: "creator",
      })
    ).toBe(false);
  });
});
