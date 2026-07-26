import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIGRATION_REQUIRED_MESSAGE } from "@/lib/service";

/**
 * createGroup uses create_group_atomic only. Fail closed when RPC is missing —
 * no non-idempotent legacy insert path (multi-instance Vercel safety).
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

describe("createGroup DB idempotency (fail closed)", () => {
  beforeEach(() => {
    getAuthUser.mockReset();
    ensureProfile.mockReset();
    rpc.mockReset();
    fromMock.mockReset();
  });

  it("uses create_group_atomic RPC when available", async () => {
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

  it("fails closed when create_group_atomic is missing", async () => {
    getAuthUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });

    const fd = new FormData();
    fd.set("name", "Weekend trip");
    fd.set("client_request_id", "shared-uuid-across-instances");

    await expect(createGroup(fd)).rejects.toThrow(MIGRATION_REQUIRED_MESSAGE);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
