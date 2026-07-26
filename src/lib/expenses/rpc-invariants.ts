/**
 * TypeScript mirror of public.assert_expense_split_payload (migration 003).
 * Used for malicious-direct-RPC unit tests without a live Postgres.
 * Keep semantics aligned with the SQL helper.
 */

export type ExpenseParticipantPayload = {
  user_id: string;
  share_amount: number | string;
  share_percentage?: number | string | null;
};

export type ExpenseSplitPayload = {
  groupId: string;
  paidBy: string;
  title: string;
  amount: number;
  splitType: string;
  participants: ExpenseParticipantPayload[];
  /** user ids that are members of the group */
  memberIds: string[];
};

export class ExpenseInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseInvariantError";
  }
}

function hasAtMostTwoDecimals(value: number): boolean {
  return Number.isFinite(value) && Math.round(value * 100) / 100 === value;
}

function sortByUserId(
  participants: ExpenseParticipantPayload[]
): ExpenseParticipantPayload[] {
  return [...participants].sort((a, b) => a.user_id.localeCompare(b.user_id));
}

export function assertExpenseSplitPayload(input: ExpenseSplitPayload): void {
  if (!["equal", "exact", "percentage"].includes(input.splitType)) {
    throw new ExpenseInvariantError("Invalid split type");
  }
  if (!input.title?.trim()) {
    throw new ExpenseInvariantError("Title is required");
  }
  if (!(input.amount > 0) || !hasAtMostTwoDecimals(input.amount)) {
    throw new ExpenseInvariantError(
      input.amount <= 0
        ? "Amount must be greater than zero"
        : "Amount must use at most 2 decimal places"
    );
  }
  if (!Array.isArray(input.participants) || input.participants.length === 0) {
    throw new ExpenseInvariantError("Select at least one participant");
  }

  const ids = input.participants.map((p) => p.user_id);
  if (new Set(ids).size !== ids.length) {
    throw new ExpenseInvariantError("Duplicate participants");
  }

  const members = new Set(input.memberIds);
  if (!members.has(input.paidBy)) {
    throw new ExpenseInvariantError(
      "Payer and participants must be members of this group"
    );
  }

  let sumShares = 0;
  let sumPct = 0;

  for (const participant of input.participants) {
    if (!members.has(participant.user_id)) {
      throw new ExpenseInvariantError(
        "Payer and participants must be members of this group"
      );
    }
    const share = Number(participant.share_amount);
    if (!Number.isFinite(share)) {
      throw new ExpenseInvariantError("Invalid share amount");
    }
    if (share < 0) {
      throw new ExpenseInvariantError("Share amount cannot be negative");
    }
    if (!hasAtMostTwoDecimals(share)) {
      throw new ExpenseInvariantError(
        "Share amount must use at most 2 decimal places"
      );
    }
    sumShares += share;

    if (input.splitType === "percentage") {
      if (
        participant.share_percentage == null ||
        String(participant.share_percentage).trim() === ""
      ) {
        throw new ExpenseInvariantError("Percentage is required");
      }
      const pct = Number(participant.share_percentage);
      if (!Number.isFinite(pct)) {
        throw new ExpenseInvariantError("Invalid percentage");
      }
      if (pct < 0) {
        throw new ExpenseInvariantError("Percentage cannot be negative");
      }
      if (!hasAtMostTwoDecimals(pct)) {
        throw new ExpenseInvariantError(
          "Percentage must use at most 2 decimal places"
        );
      }
      sumPct += pct;
    }
  }

  // Avoid float drift for money comparisons by using cents.
  if (Math.round(sumShares * 100) !== Math.round(input.amount * 100)) {
    throw new ExpenseInvariantError("Share amounts must equal expense amount");
  }

  if (input.splitType === "percentage" && Math.round(sumPct * 100) !== 10000) {
    throw new ExpenseInvariantError("Percentages must total 100");
  }

  if (input.splitType === "equal") {
    const ordered = sortByUserId(input.participants);
    const count = ordered.length;
    const amountCents = Math.round(input.amount * 100);
    const base = Math.floor(amountCents / count);
    const rem = amountCents % count;
    for (let index = 0; index < ordered.length; index += 1) {
      const cents = Math.round(Number(ordered[index]!.share_amount) * 100);
      const expected = base + (index < rem ? 1 : 0);
      if (cents !== expected) {
        throw new ExpenseInvariantError("Equal split shares are inconsistent");
      }
    }
  }

  if (input.splitType === "percentage") {
    const ordered = sortByUserId(input.participants);
    const amountCents = Math.round(input.amount * 100);
    const baseShares = ordered.map((participant) => {
      const centipercent = Math.round(Number(participant.share_percentage) * 100);
      return Math.floor((amountCents * centipercent) / 10000);
    });
    let leftover =
      amountCents - baseShares.reduce((sum, share) => sum + share, 0);
    for (let index = 0; index < ordered.length; index += 1) {
      const cents = Math.round(Number(ordered[index]!.share_amount) * 100);
      const expected =
        baseShares[index]! + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover -= 1;
      if (cents !== expected) {
        throw new ExpenseInvariantError(
          "Percentage shares do not match policy"
        );
      }
    }
  }
}
