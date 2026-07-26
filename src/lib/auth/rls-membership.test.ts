import { describe, expect, it } from "vitest";
import {
  canDirectInsertGroupMember,
  canSelfPromoteRole,
} from "./rls-membership";

describe("group_members RLS (migration 003)", () => {
  it("denies self-join without invite (known group UUID)", () => {
    expect(
      canDirectInsertGroupMember({
        actorUserId: "attacker",
        targetUserId: "attacker",
        role: "member",
        groupCreatedBy: "creator",
        actorIsMember: false,
        via: "direct",
      })
    ).toBe(false);
  });

  it("denies ordinary member adding another user", () => {
    expect(
      canDirectInsertGroupMember({
        actorUserId: "member",
        targetUserId: "victim",
        role: "member",
        groupCreatedBy: "creator",
        actorIsMember: true,
        via: "direct",
      })
    ).toBe(false);
  });

  it("denies self-promotion to admin", () => {
    expect(
      canSelfPromoteRole({
        actorUserId: "member",
        rowUserId: "member",
        newRole: "admin",
      })
    ).toBe(false);
  });

  it("allows creator adding themselves as admin (create-group fallback)", () => {
    expect(
      canDirectInsertGroupMember({
        actorUserId: "creator",
        targetUserId: "creator",
        role: "admin",
        groupCreatedBy: "creator",
        actorIsMember: false,
        via: "direct",
      })
    ).toBe(true);
  });

  it("allows invite/create RPCs as the only join paths for non-creators", () => {
    expect(
      canDirectInsertGroupMember({
        actorUserId: "joiner",
        targetUserId: "joiner",
        role: "member",
        groupCreatedBy: "creator",
        actorIsMember: false,
        via: "invite_rpc",
      })
    ).toBe(true);
  });
});
