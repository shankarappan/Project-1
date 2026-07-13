import { roundMoney } from "@/lib/format";
import type { SplitType } from "@/lib/types/database";

export interface SplitInput {
  userId: string;
  exactAmount?: number;
  percentage?: number;
}

export interface SplitResult {
  userId: string;
  shareAmount: number;
  sharePercentage: number | null;
}

export class SplitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitValidationError";
  }
}

export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: SplitInput[]
): SplitResult[] {
  if (totalAmount <= 0) {
    throw new SplitValidationError("Amount must be greater than zero.");
  }

  if (participants.length === 0) {
    throw new SplitValidationError("Select at least one participant.");
  }

  const amount = roundMoney(totalAmount);

  if (splitType === "equal") {
    return calculateEqualSplit(amount, participants);
  }

  if (splitType === "exact") {
    return calculateExactSplit(amount, participants);
  }

  return calculatePercentageSplit(amount, participants);
}

function calculateEqualSplit(
  amount: number,
  participants: SplitInput[]
): SplitResult[] {
  const count = participants.length;
  const baseShare = roundMoney(amount / count);
  let allocated = 0;

  return participants.map((participant, index) => {
    const isLast = index === count - 1;
    const shareAmount = isLast
      ? roundMoney(amount - allocated)
      : baseShare;
    allocated = roundMoney(allocated + shareAmount);

    return {
      userId: participant.userId,
      shareAmount,
      sharePercentage: roundMoney(100 / count),
    };
  });
}

function calculateExactSplit(
  amount: number,
  participants: SplitInput[]
): SplitResult[] {
  const results = participants.map((participant) => {
    if (participant.exactAmount === undefined || participant.exactAmount < 0) {
      throw new SplitValidationError("Each participant needs a valid exact amount.");
    }

    return {
      userId: participant.userId,
      shareAmount: roundMoney(participant.exactAmount),
      sharePercentage: null,
    };
  });

  const total = roundMoney(
    results.reduce((sum, result) => sum + result.shareAmount, 0)
  );

  if (total !== amount) {
    throw new SplitValidationError(
      `Exact shares must total ${amount.toFixed(2)}, but they total ${total.toFixed(2)}.`
    );
  }

  return results;
}

function calculatePercentageSplit(
  amount: number,
  participants: SplitInput[]
): SplitResult[] {
  const totalPercentage = roundMoney(
    participants.reduce((sum, participant) => sum + (participant.percentage ?? 0), 0)
  );

  if (totalPercentage !== 100) {
    throw new SplitValidationError(
      `Percentages must total 100%, but they total ${totalPercentage.toFixed(2)}%.`
    );
  }

  let allocated = 0;
  const count = participants.length;

  return participants.map((participant, index) => {
    const percentage = participant.percentage ?? 0;
    const isLast = index === count - 1;
    const shareAmount = isLast
      ? roundMoney(amount - allocated)
      : roundMoney((amount * percentage) / 100);

    allocated = roundMoney(allocated + shareAmount);

    return {
      userId: participant.userId,
      shareAmount,
      sharePercentage: roundMoney(percentage),
    };
  });
}
