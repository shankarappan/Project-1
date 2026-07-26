import { describe, expect, it } from "vitest";
import {
  createEphemeralInstance,
  createGroupDbBacked,
  FakePostgresGroupsTable,
  resolveExistingGroupAfterUniqueViolation,
} from "./idempotency";

describe("DB-backed group create idempotency", () => {
  it("documents unique-violation recovery without process memory", () => {
    const rows = [
      {
        id: "g-1",
        name: "Trip",
        createdBy: "user-1",
        clientRequestId: "req-1",
      },
    ];
    expect(
      resolveExistingGroupAfterUniqueViolation(rows, "user-1", "req-1")?.id
    ).toBe("g-1");
    expect(
      resolveExistingGroupAfterUniqueViolation(rows, "user-1", "other")
    ).toBeNull();
  });

  it("creates exactly one group for concurrent requests on one DB", async () => {
    const db = new FakePostgresGroupsTable({ insertDelayMs: 10 });
    const key = "req-abc-123";

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        createGroupDbBacked(db, {
          name: "Weekend trip",
          createdBy: "user-1",
          clientRequestId: key,
        })
      )
    );

    const ids = new Set(results.map((r) => r.group.id));
    expect(ids.size).toBe(1);
    expect(db.list()).toHaveLength(1);
    expect(results.some((r) => r.recoveredFromUniqueViolation)).toBe(true);
  });

  it("guarantees exactly-once across separate ephemeral instances (no shared memory)", async () => {
    // Shared Postgres (Supabase). Instances A/B have independent heaps — like
    // two Vercel serverless isolates that cannot see each other's Maps.
    const sharedDb = new FakePostgresGroupsTable({ insertDelayMs: 15 });
    const instanceA = createEphemeralInstance(sharedDb);
    const instanceB = createEphemeralInstance(sharedDb);
    const key = "cross-instance-uuid";

    const [fromA, fromB, fromA2, fromB2] = await Promise.all([
      instanceA.createGroup({
        name: "Weekend trip",
        createdBy: "user-1",
        clientRequestId: key,
      }),
      instanceB.createGroup({
        name: "Weekend trip",
        createdBy: "user-1",
        clientRequestId: key,
      }),
      instanceA.createGroup({
        name: "Weekend trip",
        createdBy: "user-1",
        clientRequestId: key,
      }),
      instanceB.createGroup({
        name: "Weekend trip",
        createdBy: "user-1",
        clientRequestId: key,
      }),
    ]);

    const ids = new Set([
      fromA.group.id,
      fromB.group.id,
      fromA2.group.id,
      fromB2.group.id,
    ]);
    expect(ids.size).toBe(1);
    expect(sharedDb.list()).toHaveLength(1);
    // At least one caller must have lost the insert race and recovered via SELECT.
    expect(
      [fromA, fromB, fromA2, fromB2].some((r) => r.recoveredFromUniqueViolation)
    ).toBe(true);
  });

  it("allows same display name when client_request_id differs", async () => {
    const db = new FakePostgresGroupsTable();
    const a = await createGroupDbBacked(db, {
      name: "Flat",
      createdBy: "user-1",
      clientRequestId: "key-1",
    });
    const b = await createGroupDbBacked(db, {
      name: "Flat",
      createdBy: "user-1",
      clientRequestId: "key-2",
    });

    expect(a.group.id).not.toBe(b.group.id);
    expect(db.list()).toHaveLength(2);
  });
});
