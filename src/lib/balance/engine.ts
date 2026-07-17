import { centsToDollars, dollarsToCents, sumCents } from "@/lib/money/cents";
import type { Expense, Profile, Settlement, UserBalance } from "@/lib/types/database";

export interface BalanceEntry {
  userId: string;
  balance: number;
  balanceCents: number;
}

export interface BalanceSummary {
  balances: BalanceEntry[];
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
  totalOwedCents: number;
  totalOwingCents: number;
  netBalanceCents: number;
}

/** Integer-cent ledger. Positive = is owed; negative = owes. */
export function buildBalanceLedgerCents(
  expenses: Expense[],
  settlements: Settlement[]
): Map<string, number> {
  const ledger = new Map<string, number>();

  const adjust = (userId: string, deltaCents: number) => {
    const current = ledger.get(userId) ?? 0;
    ledger.set(userId, current + deltaCents);
  };

  for (const expense of expenses) {
    adjust(expense.paid_by, dollarsToCents(Number(expense.amount)));

    const participants = expense.expense_participants ?? [];
    for (const participant of participants) {
      adjust(participant.user_id, -dollarsToCents(Number(participant.share_amount)));
    }
  }

  for (const settlement of settlements) {
    if (settlement.status === "voided") continue;
    adjust(settlement.payer_id, dollarsToCents(Number(settlement.amount)));
    adjust(settlement.receiver_id, -dollarsToCents(Number(settlement.amount)));
  }

  return ledger;
}

/** Dollar-facing ledger map (2dp), derived from integer cents. */
export function buildBalanceLedger(
  expenses: Expense[],
  settlements: Settlement[]
): Map<string, number> {
  const centsLedger = buildBalanceLedgerCents(expenses, settlements);
  const dollars = new Map<string, number>();
  for (const [userId, balanceCents] of centsLedger.entries()) {
    dollars.set(userId, centsToDollars(balanceCents));
  }
  return dollars;
}

export function summarizeBalances(
  ledger: Map<string, number>,
  profiles: Profile[]
): UserBalance[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  // Prefer reconstructing from cents when values look like dollars from buildBalanceLedger
  return Array.from(ledger.entries())
    .map(([userId, balance]) => {
      const profile = profileMap.get(userId);
      const balanceCents = dollarsToCents(balance);
      return {
        user_id: userId,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? "Unknown",
        balance: centsToDollars(balanceCents),
      };
    })
    .filter((entry) => entry.balance !== 0)
    .sort((a, b) => b.balance - a.balance);
}

export function summarizeBalancesFromCents(
  ledgerCents: Map<string, number>,
  profiles: Profile[]
): UserBalance[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return Array.from(ledgerCents.entries())
    .map(([userId, balanceCents]) => {
      const profile = profileMap.get(userId);
      return {
        user_id: userId,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? "Unknown",
        balance: centsToDollars(balanceCents),
      };
    })
    .filter((entry) => entry.balance !== 0)
    .sort((a, b) => b.balance - a.balance);
}

export function summarizeForUser(
  ledger: Map<string, number>,
  userId: string
): BalanceSummary {
  const ledgerCents = new Map<string, number>();
  for (const [id, balance] of ledger.entries()) {
    ledgerCents.set(id, dollarsToCents(balance));
  }
  return summarizeForUserCents(ledgerCents, userId);
}

export function summarizeForUserCents(
  ledgerCents: Map<string, number>,
  userId: string
): BalanceSummary {
  const userBalanceCents = ledgerCents.get(userId) ?? 0;
  const totalOwedCents = userBalanceCents > 0 ? userBalanceCents : 0;
  const totalOwingCents = userBalanceCents < 0 ? Math.abs(userBalanceCents) : 0;

  return {
    balances: Array.from(ledgerCents.entries()).map(([id, balanceCents]) => ({
      userId: id,
      balanceCents,
      balance: centsToDollars(balanceCents),
    })),
    totalOwed: centsToDollars(totalOwedCents),
    totalOwing: centsToDollars(totalOwingCents),
    netBalance: centsToDollars(userBalanceCents),
    totalOwedCents,
    totalOwingCents,
    netBalanceCents: userBalanceCents,
  };
}

export function aggregateGlobalLedger(
  groupLedgers: Map<string, number>[]
): Map<string, number> {
  const globalCents = new Map<string, number>();

  for (const ledger of groupLedgers) {
    for (const [userId, balance] of ledger.entries()) {
      const current = globalCents.get(userId) ?? 0;
      globalCents.set(userId, current + dollarsToCents(balance));
    }
  }

  const global = new Map<string, number>();
  for (const [userId, balanceCents] of globalCents.entries()) {
    global.set(userId, centsToDollars(balanceCents));
  }
  return global;
}

export function describeBalance(balance: number): string {
  if (balance > 0) return "is owed";
  if (balance < 0) return "owes";
  return "settled up";
}

/** Ledger must sum to zero (conservation of money). */
export function assertLedgerConserved(ledgerCents: Map<string, number>): void {
  const total = sumCents(Array.from(ledgerCents.values()));
  if (total !== 0) {
    throw new Error(`Ledger is not conserved: sum=${total} cents`);
  }
}

/**
 * Max settlement the payer may record without overpaying their net group debt.
 * Returns 0 if the payer does not currently owe the group.
 */
export function maxSettlementCentsForPayer(
  ledgerCents: Map<string, number>,
  payerId: string
): number {
  const balance = ledgerCents.get(payerId) ?? 0;
  return balance < 0 ? Math.abs(balance) : 0;
}
