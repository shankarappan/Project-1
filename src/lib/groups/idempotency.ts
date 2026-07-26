/**
 * Group-create idempotency contract.
 *
 * PRODUCTION AUTHORITY = Postgres only:
 * - `groups.client_request_id` + unique index
 *   `groups_created_by_client_request_id_uidx` (migration 003)
 * - `create_group_atomic(...)` RPC: insert, on unique_violation re-select
 *   and return the existing row
 *
 * Vercel runs multiple ephemeral instances. Process memory / Maps / caches
 * CANNOT guarantee exactly-once creation across instances. Do not import
 * test adapters below into server actions or route handlers.
 */

export interface GroupRecord {
  id: string;
  name: string;
  createdBy: string;
  clientRequestId: string | null;
}

/** Result of a DB-backed create that is safe under concurrent retries. */
export interface IdempotentCreateResult {
  group: GroupRecord;
  /** true when this call lost a unique-constraint race and returned the winner */
  recoveredFromUniqueViolation: boolean;
}

/**
 * Pure resolution used by production after a 23505 unique violation:
 * re-read by (created_by, client_request_id) and return that row.
 * Shared so unit tests can assert the cross-instance recovery path.
 */
export function resolveExistingGroupAfterUniqueViolation(
  rows: GroupRecord[],
  createdBy: string,
  clientRequestId: string
): GroupRecord | null {
  return (
    rows.find(
      (g) =>
        g.createdBy === createdBy && g.clientRequestId === clientRequestId
    ) ?? null
  );
}

/**
 * TEST ADAPTER ONLY — models a shared Postgres table with a unique constraint.
 * Simulates two Vercel instances by letting callers hold no shared memory;
 * the only coordination point is this fake table (stand-in for Supabase).
 */
export class FakePostgresGroupsTable {
  private rows: GroupRecord[] = [];
  private seq = 0;
  /** Artificial network/DB latency before the unique-index critical section. */
  private insertDelayMs: number;
  /** Serializes check+insert like a unique index at commit (not app memory). */
  private writeChain: Promise<void> = Promise.resolve();

  constructor(options?: { insertDelayMs?: number }) {
    this.insertDelayMs = options?.insertDelayMs ?? 5;
  }

  list(): GroupRecord[] {
    return [...this.rows];
  }

  findByRequestId(
    createdBy: string,
    clientRequestId: string
  ): GroupRecord | null {
    return resolveExistingGroupAfterUniqueViolation(
      this.rows,
      createdBy,
      clientRequestId
    );
  }

  /**
   * Mimics INSERT … RETURNING under
   * UNIQUE (created_by, client_request_id) WHERE client_request_id IS NOT NULL.
   *
   * Concurrent callers may all pass the pre-insert SELECT; only the DB
   * critical section below decides the winner (23505 for losers).
   */
  async insert(input: {
    name: string;
    createdBy: string;
    clientRequestId: string | null;
  }): Promise<{ group: GroupRecord } | { uniqueViolation: true }> {
    // Network/scheduling delay outside the index lock — allows cross-instance races.
    await delay(this.insertDelayMs);

    return new Promise((resolve) => {
      this.writeChain = this.writeChain.then(() => {
        if (input.clientRequestId) {
          const existing = this.findByRequestId(
            input.createdBy,
            input.clientRequestId
          );
          if (existing) {
            resolve({ uniqueViolation: true });
            return;
          }
        }

        const group: GroupRecord = {
          id: `g-${++this.seq}`,
          name: input.name,
          createdBy: input.createdBy,
          clientRequestId: input.clientRequestId,
        };
        this.rows.push(group);
        resolve({ group });
      });
    });
  }
}

/**
 * TEST ADAPTER ONLY — production algorithm against FakePostgresGroupsTable:
 * 1) look up existing by client_request_id
 * 2) insert
 * 3) on unique violation, re-select (authoritative, works across instances)
 *
 * Intentionally has NO process-local inflight Map: each "instance" is
 * independent, matching multi-instance Vercel.
 */
export async function createGroupDbBacked(
  db: FakePostgresGroupsTable,
  input: {
    name: string;
    createdBy: string;
    clientRequestId: string;
  }
): Promise<IdempotentCreateResult> {
  const existing = db.findByRequestId(input.createdBy, input.clientRequestId);
  if (existing) {
    return { group: existing, recoveredFromUniqueViolation: false };
  }

  const inserted = await db.insert(input);
  if ("group" in inserted) {
    return { group: inserted.group, recoveredFromUniqueViolation: false };
  }

  const recovered = db.findByRequestId(
    input.createdBy,
    input.clientRequestId
  );
  if (!recovered) {
    throw new Error(
      "Unique violation without existing row — unique index missing?"
    );
  }
  return { group: recovered, recoveredFromUniqueViolation: true };
}

/**
 * One ephemeral "Vercel instance": no shared memory with siblings.
 * Only the injected FakePostgresGroupsTable is shared (the real DB).
 */
export function createEphemeralInstance(db: FakePostgresGroupsTable) {
  return {
    createGroup(input: {
      name: string;
      createdBy: string;
      clientRequestId: string;
    }) {
      return createGroupDbBacked(db, input);
    },
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
