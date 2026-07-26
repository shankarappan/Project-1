import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const ensureProfile = vi.fn();
const requireGroupMember = vi.fn();
const assertMembersOfGroup = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/cached", () => ({
  getAuthUser: () => getAuthUser(),
  createClient: async () => ({ from: fromMock }),
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

import { createExpense } from "./expenses";

function chain(result: { data?: unknown; error?: unknown }) {
  const api: Record<string, unknown> = {};
  const self = new Proxy(api, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => unknown) =>
          Promise.resolve(result).then(resolve);
      }
      if (prop === "single" || prop === "maybeSingle") {
        return async () => result;
      }
      return () => self;
    },
  });
  return self;
}

describe("createExpense", () => {
  beforeEach(() => {
    getAuthUser.mockReset();
    ensureProfile.mockReset();
    requireGroupMember.mockReset();
    assertMembersOfGroup.mockReset();
    fromMock.mockReset();
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

  it("creates equal-split expenses with integer-cent shares", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    requireGroupMember.mockResolvedValue({ ok: true, role: "admin" });
    assertMembersOfGroup.mockResolvedValue({ ok: true });

    let insertedParticipants: unknown;
    fromMock.mockImplementation((table: string) => {
      if (table === "expenses") {
        return chain({ data: { id: "e1" }, error: null });
      }
      if (table === "expense_participants") {
        return {
          insert: (rows: unknown) => {
            insertedParticipants = rows;
            return Promise.resolve({ error: null });
          },
        };
      }
      return chain({ data: null, error: null });
    });

    const fd = new FormData();
    fd.set("title", "Dinner");
    fd.set("amount", "100.00");
    fd.set("paid_by", "u1");
    fd.set("split_type", "equal");
    fd.append("participant_ids", "u1");
    fd.append("participant_ids", "u2");
    fd.append("participant_ids", "u3");

    await expect(createExpense("g1", fd)).rejects.toThrow("REDIRECT:/groups/g1");
    expect(insertedParticipants).toEqual([
      { expense_id: "e1", user_id: "u1", share_amount: 33.33, share_percentage: 33.33 },
      { expense_id: "e1", user_id: "u2", share_amount: 33.33, share_percentage: 33.33 },
      { expense_id: "e1", user_id: "u3", share_amount: 33.34, share_percentage: 33.33 },
    ]);
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
});
