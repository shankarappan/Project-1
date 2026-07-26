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
    const count = input.participants.length;
    const amountCents = Math.round(input.amount * 100);
    const base = Math.floor(amountCents / count);
    const rem = amountCents % count;
    let high = 0;
    let low = 0;
    for (const participant of input.participants) {
      const cents = Math.round(Number(participant.share_amount) * 100);
      if (cents === base) low += 1;
      else if (cents === base + 1) high += 1;
      else throw new ExpenseInvariantError("Equal split shares are inconsistent");
    }
    if (high !== rem || high + low !== count) {
      throw new ExpenseInvariantError("Equal split shares are inconsistent");
    }
  }
}
