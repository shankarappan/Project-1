import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proves createGroup's production path recovers from a Postgres unique
 * violation (23505) by re-selecting — the cross-instance guarantee on Vercel.
 * No in-memory idempotency store is involved.
 */

const getAuthUser = vi.fn();
const ensureProfile = vi.fn();
const rpc = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/cached", () => ({
  getAuthUser: () => getAuthUser(),
  createClient: async () => ({ from: fromMock, rpc }),
}));

vi.mock("@/lib/ensure-profile", () => ({
  ensureProfile: (...args: unknown[]) => ensureProfile(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { createGroup } from "./groups";

describe("createGroup DB idempotency (cross-instance)", () => {
  beforeEach(() => {
    getAuthUser.mockReset();
    ensureProfile.mockReset();
    rpc.mockReset();
    fromMock.mockReset();
  });

  it("returns the existing group when insert hits unique(created_by, client_request_id)", async () => {
    getAuthUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    // RPC missing → exercise the insert + unique-violation fallback used when
    // two Vercel instances race the same client_request_id against Postgres.
    rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });

    let selectCalls = 0;
    fromMock.mockImplementation((table: string) => {
      if (table !== "groups") {
        return {
          insert: () => ({
            then: (resolve: (v: unknown) => unknown) =>
              resolve({ error: null }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => {
                selectCalls += 1;
                // First select (pre-insert): empty. Second (after 23505): winner.
                if (selectCalls === 1) {
                  return { data: null, error: null };
                }
                return { data: { id: "existing-group" }, error: null };
              },
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: {
                code: "23505",
                message:
                  'duplicate key value violates unique constraint "groups_created_by_client_request_id_uidx"',
              },
            }),
          }),
        }),
      };
    });

    const fd = new FormData();
    fd.set("name", "Weekend trip");
    fd.set("client_request_id", "shared-uuid-across-instances");

    await expect(createGroup(fd)).rejects.toThrow(
      "REDIRECT:/groups/existing-group"
    );
    expect(selectCalls).toBeGreaterThanOrEqual(2);
  });

  it("prefers create_group_atomic RPC (DB transaction) when available", async () => {
    getAuthUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    rpc.mockResolvedValue({ data: "rpc-group-id", error: null });

    const fd = new FormData();
    fd.set("name", "Trip");
    fd.set("client_request_id", "uuid-1");

    await expect(createGroup(fd)).rejects.toThrow(
      "REDIRECT:/groups/rpc-group-id"
    );
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("create_group_atomic", {
      p_name: "Trip",
      p_created_by: "user-1",
      p_client_request_id: "uuid-1",
    });
  });
});
