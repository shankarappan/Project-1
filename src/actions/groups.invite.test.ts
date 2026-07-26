import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const ensureProfile = vi.fn();
const requireGroupAdmin = vi.fn();
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
    requireGroupAdmin: (...args: unknown[]) => requireGroupAdmin(...args),
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

import { acceptInvite, createInvite } from "./groups";

function chain(result: { data?: unknown; error?: unknown }) {
  const self = {
    select: () => self,
    insert: () => self,
    update: () => self,
    eq: () => self,
    is: () => self,
    maybeSingle: async () => result,
    single: async () => result,
    then: (
      resolve: (value: { data?: unknown; error?: unknown }) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return self;
}

describe("createInvite authorization", () => {
  beforeEach(() => {
    getAuthUser.mockReset();
    ensureProfile.mockReset();
    requireGroupAdmin.mockReset();
    fromMock.mockReset();
    rpc.mockReset();
  });

  it("allows admins to create invites", async () => {
    getAuthUser.mockResolvedValue({ id: "admin-1", email: "a@test.com" });
    requireGroupAdmin.mockResolvedValue({ ok: true });
    fromMock.mockReturnValue(
      chain({ data: { invite_token: "tok123" }, error: null })
    );

    const result = await createInvite("group-1");
    expect(result.success).toBe(true);
    expect(result.inviteUrl).toContain("/invite/tok123");
  });

  it("denies ordinary members", async () => {
    getAuthUser.mockResolvedValue({ id: "member-1", email: "m@test.com" });
    requireGroupAdmin.mockResolvedValue({
      ok: false,
      error: "Only group admins can perform this action.",
    });

    const result = await createInvite("group-1");
    expect(result.error).toMatch(/admins/i);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("does not return raw Supabase errors to the user", async () => {
    getAuthUser.mockResolvedValue({ id: "admin-1", email: "a@test.com" });
    requireGroupAdmin.mockResolvedValue({ ok: true });
    fromMock.mockReturnValue(
      chain({
        data: null,
        error: {
          code: "42501",
          message: 'new row violates row-level security policy for table "invites"',
        },
      })
    );

    const result = await createInvite("group-1");
    expect(result.error).toMatch(/could not create invite/i);
    expect(result.error).toMatch(/ref /i);
    expect(result.error).not.toMatch(/row-level security|42501/i);
  });
});

describe("acceptInvite via RPC", () => {
  beforeEach(() => {
    getAuthUser.mockReset();
    ensureProfile.mockReset();
    fromMock.mockReset();
    rpc.mockReset();
  });

  it("accepts via accept_invite RPC", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    rpc.mockResolvedValue({ data: "g1", error: null });

    await expect(acceptInvite("tok")).rejects.toThrow("REDIRECT:/groups/g1");
    expect(rpc).toHaveBeenCalledWith("accept_invite", { p_token: "tok" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("maps expired invite errors", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    rpc.mockResolvedValue({
      data: null,
      error: { message: "This invite has expired" },
    });

    const result = await acceptInvite("expired-token");
    expect(result?.error).toMatch(/expired/i);
  });

  it("maps missing/invalid invites", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    rpc.mockResolvedValue({
      data: null,
      error: { message: "Invite not found or already used" },
    });

    const result = await acceptInvite("missing");
    expect(result?.error).toMatch(/not found|already used/i);
  });

  it("treats existing-member RPC success as a join", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    // RPC inserts with ON CONFLICT DO NOTHING then marks invite accepted
    rpc.mockResolvedValue({ data: "g1", error: null });

    await expect(acceptInvite("tok")).rejects.toThrow("REDIRECT:/groups/g1");
  });
});
