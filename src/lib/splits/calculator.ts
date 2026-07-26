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

/**
 * Calculate participant shares.
 *
 * Remainder policy (preserved from MVP): leftover cents from equal/percentage
 * splits are assigned to the **last** participant in the provided order.
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
  const count = participants.length;
  const baseShare = Math.floor(totalCents / count);
  let allocated = 0;

  return participants.map((participant, index) => {
    const isLast = index === count - 1;
    const shareAmountCents = isLast ? totalCents - allocated : baseShare;
    allocated += shareAmountCents;

    return toResult(
      participant.userId,
      shareAmountCents,
      Math.round((10000 / count)) / 100
    );
  });
}

function calculateExactSplit(
  totalCents: number,
  participants: SplitInput[]
): SplitResult[] {
  const results = participants.map((participant) => {
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
  const percentages = participants.map((participant) => {
    let centipercent = participant.percentageCentipercent;
    if (centipercent == null && participant.percentage != null) {
      centipercent = Math.round(participant.percentage * 100);
    }
    if (centipercent == null || !Number.isInteger(centipercent) || centipercent < 0) {
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

  let allocated = 0;
  const count = participants.length;

  return participants.map((participant, index) => {
    const centipercent = percentages[index]!;
    const isLast = index === count - 1;
    const shareAmountCents = isLast
      ? totalCents - allocated
      : Math.floor((totalCents * centipercent) / CENTIPERCENT_TOTAL);

    allocated += shareAmountCents;

    return toResult(
      participant.userId,
      shareAmountCents,
      centipercent / 100
    );
  });
}
