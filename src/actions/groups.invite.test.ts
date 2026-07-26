import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const ensureProfile = vi.fn();
const requireGroupAdmin = vi.fn();
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
});

describe("acceptInvite edge cases", () => {
  beforeEach(() => {
    getAuthUser.mockReset();
    ensureProfile.mockReset();
    fromMock.mockReset();
  });

  it("rejects expired invites", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    fromMock.mockImplementation((table: string) => {
      if (table === "invites") {
        return chain({
          data: {
            id: "inv1",
            group_id: "g1",
            email: null,
            expires_at: "2000-01-01T00:00:00.000Z",
            accepted_by: null,
          },
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });

    const result = await acceptInvite("expired-token");
    expect(result?.error).toMatch(/expired/i);
  });

  it("rejects missing/invalid invites", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    fromMock.mockReturnValue(chain({ data: null, error: null }));

    const result = await acceptInvite("missing");
    expect(result?.error).toMatch(/not found|already used/i);
  });

  it("treats existing members as a successful join", async () => {
    getAuthUser.mockResolvedValue({ id: "u1", email: "u@test.com" });
    fromMock.mockImplementation((table: string) => {
      if (table === "invites") {
        const api = chain({
          data: {
            id: "inv1",
            group_id: "g1",
            email: null,
            expires_at: null,
            accepted_by: null,
          },
          error: null,
        });
        return api;
      }
      if (table === "group_members") {
        return chain({ data: { id: "m1" }, error: null });
      }
      return chain({ data: null, error: null });
    });

    await expect(acceptInvite("tok")).rejects.toThrow("REDIRECT:/groups/g1");
  });
});
