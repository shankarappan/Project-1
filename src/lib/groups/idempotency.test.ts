import { describe, expect, it } from "vitest";
import { IdempotentGroupStore } from "./idempotency";

describe("group create idempotency", () => {
  it("creates exactly one group for concurrent identical submissions", async () => {
    const store = new IdempotentGroupStore();
    const key = "req-abc-123";

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        store.createGroup({
          name: "Weekend trip",
          createdBy: "user-1",
          clientRequestId: key,
        })
      )
    );

    const ids = new Set(results.map((r) => r.id));
    expect(ids.size).toBe(1);
    expect(store.list()).toHaveLength(1);
  });

  it("allows legitimate groups with the same name under different keys", async () => {
    const store = new IdempotentGroupStore();

    const a = await store.createGroup({
      name: "Flat",
      createdBy: "user-1",
      clientRequestId: "key-1",
    });
    const b = await store.createGroup({
      name: "Flat",
      createdBy: "user-1",
      clientRequestId: "key-2",
    });

    expect(a.id).not.toBe(b.id);
    expect(store.list()).toHaveLength(2);
  });
});
