import { describe, expect, it } from "vitest";
import {
  assertExpenseSplitPayload,
  ExpenseInvariantError,
} from "./rpc-invariants";

const base = {
  groupId: "g1",
  paidBy: "u1",
  title: "Dinner",
  amount: 100,
  memberIds: ["u1", "u2", "u3"],
};

describe("assertExpenseSplitPayload (malicious direct RPC)", () => {
  it("accepts a valid equal split", () => {
    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        splitType: "equal",
        participants: [
          { user_id: "u1", share_amount: 33.34 },
          { user_id: "u2", share_amount: 33.33 },
          { user_id: "u3", share_amount: 33.33 },
        ],
      })
    ).not.toThrow();
  });

  it("rejects negative shares", () => {
    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        splitType: "exact",
        participants: [
          { user_id: "u1", share_amount: -1 },
          { user_id: "u2", share_amount: 101 },
        ],
      })
    ).toThrow(ExpenseInvariantError);
  });

  it("rejects totals mismatch", () => {
    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        splitType: "exact",
        participants: [
          { user_id: "u1", share_amount: 40 },
          { user_id: "u2", share_amount: 50 },
        ],
      })
    ).toThrow(/must equal expense amount/i);
  });

  it("rejects duplicate participants", () => {
    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        splitType: "exact",
        amount: 100,
        participants: [
          { user_id: "u1", share_amount: 50 },
          { user_id: "u1", share_amount: 50 },
        ],
      })
    ).toThrow(/duplicate/i);
  });

  it("rejects invalid split type", () => {
    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        splitType: "weighted",
        participants: [{ user_id: "u1", share_amount: 100 }],
      })
    ).toThrow(/invalid split type/i);
  });

  it("rejects invalid precision on amount and shares", () => {
    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        amount: 10.123,
        splitType: "exact",
        participants: [{ user_id: "u1", share_amount: 10.123 }],
      })
    ).toThrow(/2 decimal/i);

    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        amount: 10,
        splitType: "exact",
        participants: [{ user_id: "u1", share_amount: 10.001 }],
      })
    ).toThrow(/2 decimal/i);
  });

  it("rejects percentage totals that are not 100.00", () => {
    expect(() =>
      assertExpenseSplitPayload({
        ...base,
        splitType: "percentage",
        participants: [
          { user_id: "u1", share_amount: 50, share_percentage: 50 },
          { user_id: "u2", share_amount: 50, share_percentage: 49.99 },
        ],
      })
    ).toThrow(/percentages must total 100/i);
  });
});
