import { describe, expect, it } from "vitest";
import {
  assertLedgerConserved,
  buildBalanceLedgerCents,
  maxSettlementCentsForPayer,
  summarizeBalancesFromCents,
  summarizeForUserCents,
} from "./engine";
import type { Expense, Profile, Settlement } from "@/lib/types/database";

const profiles: Profile[] = [
  {
    id: "a",
    email: "a@test.com",
    full_name: "Alice",
    avatar_url: null,
    created_at: "",
  },
  {
    id: "b",
    email: "b@test.com",
    full_name: "Bob",
    avatar_url: null,
    created_at: "",
  },
  {
    id: "c",
    email: "c@test.com",
    full_name: "Cara",
    avatar_url: null,
    created_at: "",
  },
];

function expense(partial: Partial<Expense> & Pick<Expense, "id" | "paid_by" | "amount">): Expense {
  return {
    group_id: "g1",
    created_by: partial.paid_by,
    title: "Test",
    description: null,
    currency: "NZD",
    split_type: "equal",
    expense_date: "2026-01-01",
    created_at: "",
    updated_at: "",
    expense_participants: [],
    ...partial,
  };
}

describe("balance ledger", () => {
  it("computes balances in cents and conserves money", () => {
    const expenses: Expense[] = [
      expense({
        id: "e1",
        paid_by: "a",
        amount: 100,
        expense_participants: [
          { id: "p1", expense_id: "e1", user_id: "a", share_amount: 33.33, share_percentage: null },
          { id: "p2", expense_id: "e1", user_id: "b", share_amount: 33.33, share_percentage: null },
          { id: "p3", expense_id: "e1", user_id: "c", share_amount: 33.34, share_percentage: null },
        ],
      }),
    ];

    const ledger = buildBalanceLedgerCents(expenses, []);
    expect(ledger.get("a")).toBe(6667);
    expect(ledger.get("b")).toBe(-3333);
    expect(ledger.get("c")).toBe(-3334);
    assertLedgerConserved(ledger);

    const summary = summarizeBalancesFromCents(ledger, profiles);
    expect(summary.find((s) => s.user_id === "a")?.balance).toBe(66.67);
  });

  it("fully reverses balances when an expense is removed", () => {
    const expenses: Expense[] = [
      expense({
        id: "e1",
        paid_by: "a",
        amount: 90,
        expense_participants: [
          { id: "p1", expense_id: "e1", user_id: "a", share_amount: 45, share_percentage: null },
          { id: "p2", expense_id: "e1", user_id: "b", share_amount: 45, share_percentage: null },
        ],
      }),
    ];

    const before = buildBalanceLedgerCents(expenses, []);
    expect(before.get("a")).toBe(4500);
    expect(before.get("b")).toBe(-4500);

    const afterDelete = buildBalanceLedgerCents([], []);
    expect(afterDelete.size).toBe(0);
  });

  it("recalculates when payer or participants change", () => {
    const original: Expense[] = [
      expense({
        id: "e1",
        paid_by: "a",
        amount: 100,
        expense_participants: [
          { id: "p1", expense_id: "e1", user_id: "a", share_amount: 50, share_percentage: null },
          { id: "p2", expense_id: "e1", user_id: "b", share_amount: 50, share_percentage: null },
        ],
      }),
    ];

    const edited: Expense[] = [
      expense({
        id: "e1",
        paid_by: "b",
        amount: 100,
        expense_participants: [
          { id: "p1", expense_id: "e1", user_id: "a", share_amount: 25, share_percentage: null },
          { id: "p2", expense_id: "e1", user_id: "b", share_amount: 75, share_percentage: null },
        ],
      }),
    ];

    const after = buildBalanceLedgerCents(edited, []);
    expect(after.get("a")).toBe(-2500);
    expect(after.get("b")).toBe(2500);
    assertLedgerConserved(after);
    void original;
  });
});

describe("settlements", () => {
  it("supports partial settlements and updates who-owes-whom", () => {
    const expenses: Expense[] = [
      expense({
        id: "e1",
        paid_by: "a",
        amount: 100,
        expense_participants: [
          { id: "p1", expense_id: "e1", user_id: "a", share_amount: 50, share_percentage: null },
          { id: "p2", expense_id: "e1", user_id: "b", share_amount: 50, share_percentage: null },
        ],
      }),
    ];
    const settlements: Settlement[] = [
      {
        id: "s1",
        group_id: "g1",
        payer_id: "b",
        receiver_id: "a",
        amount: 20,
        currency: "NZD",
        note: null,
        settled_at: "",
        created_by: "b",
      },
    ];

    const ledger = buildBalanceLedgerCents(expenses, settlements);
    expect(ledger.get("a")).toBe(3000);
    expect(ledger.get("b")).toBe(-3000);
    assertLedgerConserved(ledger);

    const forB = summarizeForUserCents(ledger, "b");
    expect(forB.totalOwingCents).toBe(3000);
    expect(forB.netBalanceCents).toBe(-3000);
  });

  it("computes max settlement from payer net debt (overpayment guard)", () => {
    const expenses: Expense[] = [
      expense({
        id: "e1",
        paid_by: "a",
        amount: 40,
        expense_participants: [
          { id: "p1", expense_id: "e1", user_id: "a", share_amount: 20, share_percentage: null },
          { id: "p2", expense_id: "e1", user_id: "b", share_amount: 20, share_percentage: null },
        ],
      }),
    ];
    const ledger = buildBalanceLedgerCents(expenses, []);
    expect(maxSettlementCentsForPayer(ledger, "b")).toBe(2000);
    expect(maxSettlementCentsForPayer(ledger, "a")).toBe(0);
  });

  it("reverses settlement effect on delete", () => {
    const expenses: Expense[] = [
      expense({
        id: "e1",
        paid_by: "a",
        amount: 40,
        expense_participants: [
          { id: "p1", expense_id: "e1", user_id: "a", share_amount: 20, share_percentage: null },
          { id: "p2", expense_id: "e1", user_id: "b", share_amount: 20, share_percentage: null },
        ],
      }),
    ];
    const settlements: Settlement[] = [
      {
        id: "s1",
        group_id: "g1",
        payer_id: "b",
        receiver_id: "a",
        amount: 20,
        currency: "NZD",
        note: null,
        settled_at: "",
        created_by: "b",
      },
    ];

    const withSettlement = buildBalanceLedgerCents(expenses, settlements);
    expect(withSettlement.get("a")).toBe(0);
    expect(withSettlement.get("b")).toBe(0);

    const afterDelete = buildBalanceLedgerCents(expenses, []);
    expect(afterDelete.get("a")).toBe(2000);
    expect(afterDelete.get("b")).toBe(-2000);
  });
});
