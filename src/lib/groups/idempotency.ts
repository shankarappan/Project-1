/**
 * In-memory helper used by unit/concurrency tests to prove that repeated
 * identical create-group submissions with the same client request id resolve
 * to exactly one group. Production uses the DB unique index + RPC.
 */
export interface GroupRecord {
  id: string;
  name: string;
  createdBy: string;
  clientRequestId: string | null;
}

function keyFor(createdBy: string, clientRequestId: string) {
  return `${createdBy}::${clientRequestId}`;
}

export class IdempotentGroupStore {
  private groups: GroupRecord[] = [];
  private seq = 0;
  /** In-flight create promises keyed like a unique constraint. */
  private inflight = new Map<string, Promise<GroupRecord>>();

  async createGroup(input: {
    name: string;
    createdBy: string;
    clientRequestId: string | null;
  }): Promise<GroupRecord> {
    if (input.clientRequestId) {
      const existing = this.groups.find(
        (g) =>
          g.createdBy === input.createdBy &&
          g.clientRequestId === input.clientRequestId
      );
      if (existing) return existing;

      const mapKey = keyFor(input.createdBy, input.clientRequestId);
      const pending = this.inflight.get(mapKey);
      if (pending) return pending;

      const createPromise = this.insertWithLatency(input).finally(() => {
        this.inflight.delete(mapKey);
      });
      this.inflight.set(mapKey, createPromise);
      return createPromise;
    }

    return this.insertWithLatency(input);
  }

  private async insertWithLatency(input: {
    name: string;
    createdBy: string;
    clientRequestId: string | null;
  }): Promise<GroupRecord> {
    // Simulate async latency so concurrent callers can race the first check.
    await new Promise((resolve) => setTimeout(resolve, 5));

    if (input.clientRequestId) {
      const raced = this.groups.find(
        (g) =>
          g.createdBy === input.createdBy &&
          g.clientRequestId === input.clientRequestId
      );
      if (raced) return raced;
    }

    const group: GroupRecord = {
      id: `g-${++this.seq}`,
      name: input.name,
      createdBy: input.createdBy,
      clientRequestId: input.clientRequestId,
    };
    this.groups.push(group);
    return group;
  }

  list() {
    return [...this.groups];
  }
}
