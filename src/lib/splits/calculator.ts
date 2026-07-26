import {
  CENTIPERCENT_TOTAL,
  MoneyParseError,
  assertPositiveCents,
  centsToDollars,
  dollarsToCents,
  sumCents,
} from "@/lib/money/cents";
import type { SplitType } from "@/lib/types/database";

export interface SplitInput {
  userId: string;
  exactAmount?: number;
  exactAmountCents?: number;
  percentage?: number;
  percentageCentipercent?: number;
}

export interface SplitResult {
  userId: string;
  shareAmount: number;
  shareAmountCents: number;
  sharePercentage: number | null;
}

export class SplitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitValidationError";
  }
}

export interface CalculateSplitsOptions {
  /** Preferred: total already parsed as integer cents */
  totalAmountCents?: number;
}

/** Sort by immutable user id so UI order cannot change money outcomes. */
export function sortParticipantsByUserId<T extends { userId: string }>(
  participants: T[]
): T[] {
  return [...participants].sort((a, b) => a.userId.localeCompare(b.userId));
}

/**
 * Allocate centipercent units that sum exactly to 10000 (100.00%).
 * Remainder units go to the first N entries in the provided order
 * (callers should pass userIds sorted immutably).
 */
export function allocateEqualCentipercent(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(CENTIPERCENT_TOTAL / count);
  const remainder = CENTIPERCENT_TOTAL % count;
  return Array.from({ length: count }, (_, index) =>
    base + (index < remainder ? 1 : 0)
  );
}

/**
 * Build a percentage map for selected member ids totaling exactly 100.00%.
 * Keys are user ids; allocation order is sorted user id.
 */
export function equalPercentageState(
  selectedUserIds: string[]
): Record<string, string> {
  const sorted = [...selectedUserIds].sort((a, b) => a.localeCompare(b));
  const units = allocateEqualCentipercent(sorted.length);
  const state: Record<string, string> = {};
  sorted.forEach((userId, index) => {
    state[userId] = (units[index]! / 100).toFixed(2);
  });
  return state;
}

/**
 * Distribute leftover integer units (cents or centipercent) to the first
 * `remainder` participants in already-sorted order.
 */
export function distributeRemainderUnits(
  baseShares: number[],
  total: number
): number[] {
  const allocated = sumCents(baseShares);
  let leftover = total - allocated;
  if (leftover < 0) {
    throw new SplitValidationError("Internal split allocation underflow.");
  }
  return baseShares.map((share) => {
    if (leftover > 0) {
      leftover -= 1;
      return share + 1;
    }
    return share;
  });
}

/**
 * Calculate participant shares.
 *
 * Remainder policy: sort by immutable user id, then give leftover cents to
 * the first N participants in that sorted order (not form/UI order).
 */
export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: SplitInput[],
  options?: CalculateSplitsOptions
): SplitResult[] {
  if (participants.length === 0) {
    throw new SplitValidationError("Select at least one participant.");
  }

  let totalCents: number;
  try {
    totalCents =
      options?.totalAmountCents ?? dollarsToCents(totalAmount);
    assertPositiveCents(totalCents, "Amount");
  } catch (err) {
    if (err instanceof MoneyParseError) {
      throw new SplitValidationError(err.message);
    }
    throw err;
  }

  if (splitType === "equal") {
    return calculateEqualSplit(totalCents, participants);
  }

  if (splitType === "exact") {
    return calculateExactSplit(totalCents, participants);
  }

  return calculatePercentageSplit(totalCents, participants);
}

function toResult(
  userId: string,
  shareAmountCents: number,
  sharePercentage: number | null
): SplitResult {
  return {
    userId,
    shareAmountCents,
    shareAmount: centsToDollars(shareAmountCents),
    sharePercentage,
  };
}

function calculateEqualSplit(
  totalCents: number,
  participants: SplitInput[]
): SplitResult[] {
  const ordered = sortParticipantsByUserId(participants);
  const count = ordered.length;
  const baseShare = Math.floor(totalCents / count);
  const baseShares = Array.from({ length: count }, () => baseShare);
  const shares = distributeRemainderUnits(baseShares, totalCents);
  const percentages = allocateEqualCentipercent(count);

  return ordered.map((participant, index) =>
    toResult(
      participant.userId,
      shares[index]!,
      percentages[index]! / 100
    )
  );
}

function calculateExactSplit(
  totalCents: number,
  participants: SplitInput[]
): SplitResult[] {
  const ordered = sortParticipantsByUserId(participants);
  const results = ordered.map((participant) => {
    let cents = participant.exactAmountCents;
    if (cents == null && participant.exactAmount != null) {
      cents = dollarsToCents(participant.exactAmount);
    }
    if (cents == null || !Number.isInteger(cents) || cents < 0) {
      throw new SplitValidationError(
        "Each participant needs a valid exact amount."
      );
    }

    return toResult(participant.userId, cents, null);
  });

  const total = sumCents(results.map((r) => r.shareAmountCents));
  if (total !== totalCents) {
    throw new SplitValidationError(
      `Exact shares must total ${centsToDollars(totalCents).toFixed(2)}, but they total ${centsToDollars(total).toFixed(2)}.`
    );
  }

  return results;
}

function calculatePercentageSplit(
  totalCents: number,
  participants: SplitInput[]
): SplitResult[] {
  const ordered = sortParticipantsByUserId(participants);

  const percentages = ordered.map((participant) => {
    let centipercent = participant.percentageCentipercent;
    if (centipercent == null && participant.percentage != null) {
      centipercent = Math.round(participant.percentage * 100);
    }
    if (
      centipercent == null ||
      !Number.isInteger(centipercent) ||
      centipercent < 0
    ) {
      throw new SplitValidationError(
        "Each participant needs a valid percentage."
      );
    }
    return centipercent;
  });

  const totalPercentage = sumCents(percentages);
  if (totalPercentage !== CENTIPERCENT_TOTAL) {
    throw new SplitValidationError(
      `Percentages must total 100%, but they total ${(totalPercentage / 100).toFixed(2)}%.`
    );
  }

  const baseShares = percentages.map((centipercent) =>
    Math.floor((totalCents * centipercent) / CENTIPERCENT_TOTAL)
  );
  const shares = distributeRemainderUnits(baseShares, totalCents);

  return ordered.map((participant, index) =>
    toResult(
      participant.userId,
      shares[index]!,
      percentages[index]! / 100
    )
  );
}
