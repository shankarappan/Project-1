import { roundMoney } from "@/lib/format";
import type { Expense, Profile, Settlement, UserBalance } from "@/lib/types/database";

export interface BalanceEntry {
  userId: string;
  balance: number;
}

export interface BalanceSummary {
  balances: BalanceEntry[];
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
}

export function buildBalanceLedger(
  expenses: Expense[],
  settlements: Settlement[]
): Map<string, number> {
  const ledger = new Map<string, number>();

  const adjust = (userId: string, delta: number) => {
    const current = ledger.get(userId) ?? 0;
    ledger.set(userId, roundMoney(current + delta));
  };

  for (const expense of expenses) {
    adjust(expense.paid_by, expense.amount);

    const participants = expense.expense_participants ?? [];
    for (const participant of participants) {
      adjust(participant.user_id, -participant.share_amount);
    }
  }

  for (const settlement of settlements) {
    adjust(settlement.payer_id, settlement.amount);
    adjust(settlement.receiver_id, -settlement.amount);
  }

  return ledger;
}

export function summarizeBalances(
  ledger: Map<string, number>,
  profiles: Profile[]
): UserBalance[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return Array.from(ledger.entries())
    .map(([userId, balance]) => {
      const profile = profileMap.get(userId);
      return {
        user_id: userId,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? "Unknown",
        balance: roundMoney(balance),
      };
    })
    .filter((entry) => entry.balance !== 0)
    .sort((a, b) => b.balance - a.balance);
}

export function summarizeForUser(
  ledger: Map<string, number>,
  userId: string
): BalanceSummary {
  let totalOwed = 0;
  let totalOwing = 0;

  for (const [id, balance] of ledger.entries()) {
    if (id !== userId) continue;
    if (balance > 0) totalOwed = balance;
    if (balance < 0) totalOwing = Math.abs(balance);
  }

  const userBalance = ledger.get(userId) ?? 0;

  return {
    balances: Array.from(ledger.entries()).map(([id, balance]) => ({
      userId: id,
      balance: roundMoney(balance),
    })),
    totalOwed: roundMoney(totalOwed),
    totalOwing: roundMoney(totalOwing),
    netBalance: roundMoney(userBalance),
  };
}

export function aggregateGlobalLedger(
  groupLedgers: Map<string, number>[]
): Map<string, number> {
  const global = new Map<string, number>();

  for (const ledger of groupLedgers) {
    for (const [userId, balance] of ledger.entries()) {
      const current = global.get(userId) ?? 0;
      global.set(userId, roundMoney(current + balance));
    }
  }

  return global;
}

export function describeBalance(balance: number): string {
  if (balance > 0) return "is owed";
  if (balance < 0) return "owes";
  return "settled up";
}
