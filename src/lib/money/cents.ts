/**
 * Integer minor-unit (cents) helpers for monetary amounts.
 *
 * Storage in Postgres remains numeric(12,2) dollars for compatibility.
 * All calculation and validation in application code use integer cents.
 *
 * Business rules (see also src/lib/money/rules.ts):
 * - Equal-split remainder is assigned to the last participant in input order.
 * - Percentage shares use integer centipercent (100.00% = 10000).
 * - Max amount is numeric(12,2) ceiling: 9_999_999_999.99
 */

export const MAX_AMOUNT_CENTS = 999_999_999_999; // $9,999,999,999.99
export const CENTIPERCENT_TOTAL = 10_000; // 100.00%

export class MoneyParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyParseError";
  }
}

/** Convert a dollar number already known to be finite into cents (half-up). */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    throw new MoneyParseError("Amount is not a finite number.");
  }
  return Math.round(dollars * 100);
}

/** Convert cents to a dollar number for DB/display boundaries only. */
export function centsToDollars(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new MoneyParseError("Cents must be an integer.");
  }
  return cents / 100;
}

/**
 * Parse a user-entered money string into cents without floating-point math.
 * Accepts "100", "100.5", "100.50", "1,000.00". Rejects blanks and negatives.
 */
export function parseMoneyToCents(raw: string | null | undefined): number {
  if (raw == null) {
    throw new MoneyParseError("Amount is required.");
  }

  const trimmed = String(raw).trim().replace(/,/g, "");
  if (!trimmed) {
    throw new MoneyParseError("Amount is required.");
  }

  if (trimmed.startsWith("-")) {
    throw new MoneyParseError("Amount cannot be negative.");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new MoneyParseError("Enter a valid amount with up to 2 decimal places.");
  }

  const [wholePart, fracPart = ""] = trimmed.split(".");
  const whole = Number(wholePart);
  const frac = Number((fracPart + "00").slice(0, 2));

  if (!Number.isSafeInteger(whole) || whole > Math.floor(MAX_AMOUNT_CENTS / 100)) {
    throw new MoneyParseError("Amount is too large.");
  }

  const cents = whole * 100 + frac;
  if (cents > MAX_AMOUNT_CENTS) {
    throw new MoneyParseError("Amount is too large.");
  }

  return cents;
}

/**
 * Parse a percentage string into centipercent units (33.33% → 3333).
 * Up to 2 decimal places; must be non-negative.
 */
export function parsePercentageToCentipercent(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === "") {
    throw new MoneyParseError("Percentage is required.");
  }

  const trimmed = String(raw).trim();
  if (trimmed.startsWith("-")) {
    throw new MoneyParseError("Percentage cannot be negative.");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new MoneyParseError("Enter a valid percentage with up to 2 decimal places.");
  }

  const [wholePart, fracPart = ""] = trimmed.split(".");
  const whole = Number(wholePart);
  const frac = Number((fracPart + "00").slice(0, 2));
  const value = whole * 100 + frac;

  if (value > CENTIPERCENT_TOTAL * 10) {
    throw new MoneyParseError("Percentage is too large.");
  }

  return value;
}

export function centipercentToDisplay(centipercent: number): number {
  return centipercent / 100;
}

export function assertPositiveCents(cents: number, label = "Amount"): void {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new MoneyParseError(`${label} must be greater than zero.`);
  }
  if (cents > MAX_AMOUNT_CENTS) {
    throw new MoneyParseError(`${label} is too large.`);
  }
}

export function sumCents(values: number[]): number {
  let total = 0;
  for (const value of values) {
    if (!Number.isInteger(value)) {
      throw new MoneyParseError("Cents must be integers.");
    }
    total += value;
  }
  return total;
}
