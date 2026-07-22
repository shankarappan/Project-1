import {
  assertPositiveCents,
  CENTIPERCENT_TOTAL,
  centipercentToDisplay,
  centsToDollars,
  dollarsToCents,
  parseMoneyToCents,
  parsePercentageToCentipercent,
  sumCents,
} from "@/lib/money/cents";
import type { SplitType } from "@/lib/types/database";

export interface SplitInput {
  userId: string;
  /** Exact share in dollars (form boundary). Prefer exactAmountCents. */
  exactAmount?: number;
  exactAmountCents?: number;
  /** Percentage 0–100 (form boundary). Prefer percentageCentipercent. */
  percentage?: number;
  percentageCentipercent?: number;
}

export interface SplitResult {
  userId: string;
  /** Dollar amount for DB compatibility (2dp). */
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

/**
 * Calculate splits using integer cents. `totalAmount` may be dollars (legacy)
 * or you may pass totalAmountCents via options.
 */
export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: SplitInput[],
  options?: { totalAmountCents?: number }
): SplitResult[] {
  const totalCents =
    options?.totalAmountCents ?? dollarsToCents(totalAmount);

  try {
    assertPositiveCents(totalCents, "Amount");
  } catch (err) {
    throw new SplitValidationError(
      err instanceof Error ? err.message : "Amount must be greater than zero."
    );
  }

  if (participants.length === 0) {
    throw new SplitValidationError("Select at least one participant.");
  }

  const uniqueIds = new Set(participants.map((p) => p.userId));
  if (uniqueIds.size !== participants.length) {
    throw new SplitValidationError("Duplicate participants are not allowed.");
  }

  if (splitType === "equal") {
    return toResults(calculateEqualSplitCents(totalCents, participants));
  }

  if (splitType === "exact") {
    return toResults(calculateExactSplitCents(totalCents, participants));
  }

  return toResults(calculatePercentageSplitCents(totalCents, participants));
}

export function calculateSplitsFromForm(
  amountRaw: string,
  splitType: SplitType,
  participants: SplitInput[]
): SplitResult[] {
  let totalCents: number;
  try {
    totalCents = parseMoneyToCents(amountRaw);
  } catch (err) {
    throw new SplitValidationError(
      err instanceof Error ? err.message : "Enter a valid amount."
    );
  }

  if (totalCents <= 0) {
    throw new SplitValidationError("Amount must be greater than zero.");
  }

  return calculateSplits(0, splitType, participants, { totalAmountCents: totalCents });
}

interface InternalShare {
  userId: string;
  shareAmountCents: number;
  sharePercentage: number | null;
}

function toResults(shares: InternalShare[]): SplitResult[] {
  return shares.map((share) => ({
    userId: share.userId,
    shareAmountCents: share.shareAmountCents,
    shareAmount: centsToDollars(share.shareAmountCents),
    sharePercentage: share.sharePercentage,
  }));
}

function calculateEqualSplitCents(
  totalCents: number,
  participants: SplitInput[]
): InternalShare[] {
  const count = participants.length;
  const baseShare = Math.floor(totalCents / count);
  let remainder = totalCents - baseShare * count;

  // Deterministic by immutable participant ID (not UI / form order).
  const sortedIds = [...participants]
    .map((p) => p.userId)
    .sort((a, b) => a.localeCompare(b));

  const amounts = new Map<string, number>();
  for (const userId of sortedIds) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    amounts.set(userId, baseShare + extra);
  }

  const sharePercentage = Math.round(10000 / count) / 100;

  // Preserve caller order for display; amounts come from sorted distribution.
  return participants.map((participant) => ({
    userId: participant.userId,
    shareAmountCents: amounts.get(participant.userId) ?? baseShare,
    sharePercentage,
  }));
}

function resolveExactCents(participant: SplitInput): number {
  if (participant.exactAmountCents !== undefined) {
    if (
      !Number.isInteger(participant.exactAmountCents) ||
      participant.exactAmountCents < 0
    ) {
      throw new SplitValidationError(
        "Each participant needs a valid exact amount."
      );
    }
    return participant.exactAmountCents;
  }

  if (participant.exactAmount === undefined || Number.isNaN(participant.exactAmount)) {
    throw new SplitValidationError(
      "Each participant needs a valid exact amount."
    );
  }

  if (participant.exactAmount < 0) {
    throw new SplitValidationError(
      "Each participant needs a valid exact amount."
    );
  }

  return dollarsToCents(participant.exactAmount);
}

function calculateExactSplitCents(
  totalCents: number,
  participants: SplitInput[]
): InternalShare[] {
  const results = participants.map((participant) => ({
    userId: participant.userId,
    shareAmountCents: resolveExactCents(participant),
    sharePercentage: null,
  }));

  const total = sumCents(results.map((r) => r.shareAmountCents));

  if (total !== totalCents) {
    throw new SplitValidationError(
      `Exact shares must total ${centsToDollars(totalCents).toFixed(2)}, but they total ${centsToDollars(total).toFixed(2)}.`
    );
  }

  return results;
}

function resolvePercentageCentipercent(participant: SplitInput): number {
  if (participant.percentageCentipercent !== undefined) {
    if (
      !Number.isInteger(participant.percentageCentipercent) ||
      participant.percentageCentipercent < 0
    ) {
      throw new SplitValidationError(
        "Each participant needs a valid percentage."
      );
    }
    return participant.percentageCentipercent;
  }

  if (participant.percentage === undefined || Number.isNaN(participant.percentage)) {
    throw new SplitValidationError(
      "Each participant needs a valid percentage."
    );
  }

  if (participant.percentage < 0) {
    throw new SplitValidationError(
      "Each participant needs a valid percentage."
    );
  }

  // Convert via string to avoid float artifacts when possible
  try {
    return parsePercentageToCentipercent(String(participant.percentage));
  } catch {
    return Math.round(participant.percentage * 100);
  }
}

function calculatePercentageSplitCents(
  totalCents: number,
  participants: SplitInput[]
): InternalShare[] {
  const parts = participants.map((participant) => ({
    userId: participant.userId,
    percentageCentipercent: resolvePercentageCentipercent(participant),
  }));

  const totalPercentage = sumCents(
    parts.map((p) => p.percentageCentipercent)
  );

  if (totalPercentage !== CENTIPERCENT_TOTAL) {
    throw new SplitValidationError(
      `Percentages must total 100%, but they total ${centipercentToDisplay(totalPercentage).toFixed(2)}%.`
    );
  }

  const amounts = new Map<string, number>();
  let allocated = 0;

  for (const part of parts) {
    const share = Math.floor(
      (totalCents * part.percentageCentipercent) / CENTIPERCENT_TOTAL
    );
    amounts.set(part.userId, share);
    allocated += share;
  }

  let remainder = totalCents - allocated;
  const sortedIds = [...parts]
    .map((p) => p.userId)
    .sort((a, b) => a.localeCompare(b));

  for (const userId of sortedIds) {
    if (remainder <= 0) break;
    amounts.set(userId, (amounts.get(userId) ?? 0) + 1);
    remainder -= 1;
  }

  return parts.map((part) => ({
    userId: part.userId,
    shareAmountCents: amounts.get(part.userId) ?? 0,
    sharePercentage: centipercentToDisplay(part.percentageCentipercent),
  }));
}

/** @deprecated Prefer calculateSplits; kept for call-site clarity in tests. */
export function calculateEqualSplitForTest(
  totalCents: number,
  userIds: string[]
): SplitResult[] {
  return calculateSplits(0, "equal", userIds.map((userId) => ({ userId })), {
    totalAmountCents: totalCents,
  });
}
