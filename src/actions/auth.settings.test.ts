import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/cached", () => ({
  createClient: vi.fn(),
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/ensure-profile", () => ({
  ensureProfile: vi.fn(async () => undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { createClient, getAuthUser } from "@/lib/supabase/cached";
import { seedDemoData, updateProfile } from "@/actions/auth";

describe("settings / demo seed actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateProfile returns an error instead of throwing when unauthenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const result = await updateProfile(new FormData());
    expect(result).toEqual({
      error: "Not authenticated. Please sign in again.",
    });
  });

  it("seedDemoData falls back to inserts when RPC is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      id: "user-1",
      email: "a@test.com",
    } as never);

    const insertCalls: string[] = [];
    const supabase = {
      rpc: vi.fn(async () => ({
        error: {
          code: "PGRST202",
          message: "Could not find the function public.seed_demo_for_user",
        },
      })),
      from: vi.fn((table: string) => {
        insertCalls.push(table);
        if (table === "groups") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: "group-1" },
                  error: null,
                })),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          };
        }
        if (table === "group_members") {
          return {
            insert: vi.fn(async () => ({ error: null })),
          };
        }
        if (table === "expenses") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: `expense-${insertCalls.length}` },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "expense_participants") {
          return {
            insert: vi.fn(async () => ({ error: null })),
          };
        }
        return {
          insert: vi.fn(async () => ({ error: null })),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await seedDemoData();
    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalled();
    expect(insertCalls).toContain("groups");
    expect(insertCalls).toContain("expenses");
  });
});
