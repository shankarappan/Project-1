import { describe, expect, it } from "vitest";
import { canPerformOwnerAction } from "./membership";

describe("invite / owner authorization", () => {
  it("allows admin role", () => {
    expect(
      canPerformOwnerAction({
        role: "admin",
        userId: "u1",
        groupCreatedBy: "other",
      })
    ).toBe(true);
  });

  it("allows group creator even if role is member", () => {
    expect(
      canPerformOwnerAction({
        role: "member",
        userId: "u1",
        groupCreatedBy: "u1",
      })
    ).toBe(true);
  });

  it("rejects ordinary members who are not the creator", () => {
    expect(
      canPerformOwnerAction({
        role: "member",
        userId: "u2",
        groupCreatedBy: "u1",
      })
    ).toBe(false);
  });

  it("rejects non-members (null role)", () => {
    expect(
      canPerformOwnerAction({
        role: null,
        userId: "u3",
        groupCreatedBy: "u1",
      })
    ).toBe(false);
  });
});
