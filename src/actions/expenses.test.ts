import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIGRATION_REQUIRED_MESSAGE } from "@/lib/service";

const getAuthUser = vi.fn();
const ensureProfile = vi.fn();
const requireGroupMember = vi.fn();
const assertMembersOfGroup = vi.fn();
const fromMock = vi.fn();
const rpc = vi.fn();

vi.mock("@/lib/supabase/cached", () => ({
  getAuthUser: () => getAuthUser(),
  createClient: async () => ({ from: fromMock, rpc }),
}));

vi.mock("@/lib/ensure-profile", () => ({
  ensureProfile: (...args: unknown[]) => ensureProfile(...args),
}));

vi.mock("@/lib/auth/membership", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/membership")>(
    "@/lib/auth/membership"
  );
  return {
    ...actual,
    requireGroupMember: (...args: unknown[]) => requireGroupMember(...args),
    assertMembersOfGroup: (...args: unknown[]) => assertMembersOfGroup(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { createExpense, updateExpense } from "./expenses";

describe("createExpense", () => {
  beforeEach(() => {
    getAuthUser.mockReset();
    ensureProfile.mockReset();
    requireGroupMember.mockReset();
    assertMembersOfGroup.mockReset();
    fromMock.mockReset();
    rpc.mockReset();
  });

  it("rejects non-members and non-member payers/participants", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    requireGroupMember.mockResolvedValue({
      ok: false,
      error: "You are not a member of this group.",
    });

    const fd = new FormData();
    fd.set("title", "Dinner");
    fd.set("amount", "10.00");
    fd.set("paid_by", "u1");
    fd.set("split_type", "equal");
    fd.append("participant_ids", "u1");

    const denied = await createExpense("g1", fd);
    expect(denied.error).toMatch(/not a member/i);

    requireGroupMember.mockResolvedValue({ ok: true, role: "admin" });
    assertMembersOfGroup.mockResolvedValue({
      ok: false,
      error: "Payer and participants must be members of this group.",
    });

    const badMembers = await createExpense("g1", fd);
    expect(badMembers.error).toMatch(/must be members/i);
  });

  it("creates via atomic RPC with sorted integer-cent shares", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    requireGroupMember.mockResolvedValue({ ok: true, role: "admin" });
    assertMembersOfGroup.mockResolvedValue({ ok: true });
    rpc.mockResolvedValue({ data: "e1", error: null });

    const fd = new FormData();
    fd.set("title", "Dinner");
    fd.set("amount", "100.00");
    fd.set("paid_by", "u1");
    fd.set("split_type", "equal");
    fd.append("participant_ids", "u3");
    fd.append("participant_ids", "u1");
    fd.append("participant_ids", "u2");

    await expect(createExpense("g1", fd)).rejects.toThrow("REDIRECT:/groups/g1");
    expect(rpc).toHaveBeenCalledWith(
      "create_expense_atomic",
      expect.objectContaining({
        p_group_id: "g1",
        p_participants: [
          { user_id: "u1", share_amount: 33.34, share_percentage: "33.34" },
          { user_id: "u2", share_amount: 33.33, share_percentage: "33.33" },
          { user_id: "u3", share_amount: 33.33, share_percentage: "33.33" },
        ],
      })
    );
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("fails closed when create_expense_atomic is missing (no legacy path)", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    requireGroupMember.mockResolvedValue({ ok: true, role: "admin" });
    assertMembersOfGroup.mockResolvedValue({ ok: true });
    rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });

    const fd = new FormData();
    fd.set("title", "Dinner");
    fd.set("amount", "10.00");
    fd.set("paid_by", "u1");
    fd.set("split_type", "equal");
    fd.append("participant_ids", "u1");

    const result = await createExpense("g1", fd);
    expect(result.error).toBe(MIGRATION_REQUIRED_MESSAGE);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects exact splits that do not total the amount", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    requireGroupMember.mockResolvedValue({ ok: true, role: "admin" });
    assertMembersOfGroup.mockResolvedValue({ ok: true });

    const fd = new FormData();
    fd.set("title", "Taxi");
    fd.set("amount", "10.00");
    fd.set("paid_by", "u1");
    fd.set("split_type", "exact");
    fd.append("participant_ids", "u1");
    fd.append("participant_ids", "u2");
    fd.set("exact_u1", "4.00");
    fd.set("exact_u2", "5.00");

    const result = await createExpense("g1", fd);
    expect(result.error).toMatch(/must total/i);
  });

  it("updates via atomic RPC so participant replace is transactional", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    requireGroupMember.mockResolvedValue({ ok: true, role: "admin" });
    assertMembersOfGroup.mockResolvedValue({ ok: true });
    rpc.mockResolvedValue({ data: "e1", error: null });

    const fd = new FormData();
    fd.set("title", "Dinner");
    fd.set("amount", "20.00");
    fd.set("paid_by", "u1");
    fd.set("split_type", "equal");
    fd.set("expense_date", "2026-01-01");
    fd.append("participant_ids", "u1");
    fd.append("participant_ids", "u2");

    const result = await updateExpense("e1", "g1", fd);
    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "update_expense_atomic",
      expect.objectContaining({ p_expense_id: "e1", p_group_id: "g1" })
    );
  });

  it("fails closed when update_expense_atomic is missing", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    requireGroupMember.mockResolvedValue({ ok: true, role: "admin" });
    assertMembersOfGroup.mockResolvedValue({ ok: true });
    rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });

    const fd = new FormData();
    fd.set("title", "Dinner");
    fd.set("amount", "20.00");
    fd.set("paid_by", "u1");
    fd.set("split_type", "equal");
    fd.set("expense_date", "2026-01-01");
    fd.append("participant_ids", "u1");

    const result = await updateExpense("e1", "g1", fd);
    expect(result.error).toBe(MIGRATION_REQUIRED_MESSAGE);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
