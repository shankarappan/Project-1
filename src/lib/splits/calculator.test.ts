import { describe, expect, it } from "vitest";
import {
  SplitValidationError,
  calculateEqualSplitForTest,
  calculateSplits,
} from "./calculator";
import { sumCents } from "@/lib/money/cents";

describe("equal split", () => {
  it("splits $100 among 3 people deterministically with remainder on last", () => {
    const results = calculateEqualSplitForTest(10000, ["a", "b", "c"]);
    expect(results.map((r) => r.shareAmountCents)).toEqual([3333, 3333, 3334]);
    expect(sumCents(results.map((r) => r.shareAmountCents))).toBe(10000);
    expect(results.map((r) => r.shareAmount)).toEqual([33.33, 33.33, 33.34]);
  });

  it("assigns remainder consistently on repeated calls", () => {
    const first = calculateEqualSplitForTest(10000, ["a", "b", "c"]);
    const second = calculateEqualSplitForTest(10000, ["a", "b", "c"]);
    expect(first).toEqual(second);
  });
});

describe("exact split", () => {
  it("accepts shares that total the expense", () => {
    const results = calculateSplits(
      0,
      "exact",
      [
        { userId: "a", exactAmountCents: 4000 },
        { userId: "b", exactAmountCents: 6000 },
      ],
      { totalAmountCents: 10000 }
    );
    expect(sumCents(results.map((r) => r.shareAmountCents))).toBe(10000);
  });

  it("rejects shares that do not total the expense", () => {
    expect(() =>
      calculateSplits(
        0,
        "exact",
        [
          { userId: "a", exactAmountCents: 4000 },
          { userId: "b", exactAmountCents: 5000 },
        ],
        { totalAmountCents: 10000 }
      )
    ).toThrow(SplitValidationError);
  });

  it("rejects negative exact amounts", () => {
    expect(() =>
      calculateSplits(
        0,
        "exact",
        [{ userId: "a", exactAmountCents: -1 }],
        { totalAmountCents: 100 }
      )
    ).toThrow(SplitValidationError);
  });

  it("rejects blank exact amounts (undefined)", () => {
    expect(() =>
      calculateSplits(
        0,
        "exact",
        [{ userId: "a" }],
        { totalAmountCents: 100 }
      )
    ).toThrow(/valid exact amount/i);
  });
});

describe("percentage split", () => {
  it("requires percentages to total exactly 100%", () => {
    expect(() =>
      calculateSplits(
        0,
        "percentage",
        [
          { userId: "a", percentageCentipercent: 5000 },
          { userId: "b", percentageCentipercent: 4000 },
        ],
        { totalAmountCents: 10000 }
      )
    ).toThrow(/100%/);
  });

  it("handles decimal percentages predictably and conserves cents", () => {
    const results = calculateSplits(
      0,
      "percentage",
      [
        { userId: "a", percentageCentipercent: 3333 },
        { userId: "b", percentageCentipercent: 3333 },
        { userId: "c", percentageCentipercent: 3334 },
      ],
      { totalAmountCents: 10000 }
    );
    expect(sumCents(results.map((r) => r.shareAmountCents))).toBe(10000);
    expect(results[2]?.shareAmountCents).toBe(
      10000 - results[0]!.shareAmountCents - results[1]!.shareAmountCents
    );
  });
});

describe("expense edge cases", () => {
  it("rejects zero and negative expenses", () => {
    expect(() =>
      calculateSplits(0, "equal", [{ userId: "a" }], { totalAmountCents: 0 })
    ).toThrow(SplitValidationError);
    expect(() =>
      calculateSplits(0, "equal", [{ userId: "a" }], { totalAmountCents: -100 })
    ).toThrow(SplitValidationError);
  });

  it("handles very large amounts safely", () => {
    const results = calculateSplits(
      0,
      "equal",
      [{ userId: "a" }, { userId: "b" }],
      { totalAmountCents: 999_999_999_999 }
    );
    expect(sumCents(results.map((r) => r.shareAmountCents))).toBe(
      999_999_999_999
    );
  });

  it("allows payer to also be in the split", () => {
    const results = calculateSplits(
      0,
      "equal",
      [{ userId: "payer" }, { userId: "other" }],
      { totalAmountCents: 10000 }
    );
    expect(results.find((r) => r.userId === "payer")?.shareAmountCents).toBe(
      5000
    );
  });
});
