import { describe, expect, it } from "vitest";
import {
  allocateEqualCentipercent,
  calculateSplits,
  equalPercentageState,
  SplitValidationError,
} from "./calculator";
import { sumCents } from "@/lib/money/cents";

describe("allocateEqualCentipercent", () => {
  it("totals exactly 100.00 for 3 participants", () => {
    expect(allocateEqualCentipercent(3)).toEqual([3334, 3333, 3333]);
    expect(sumCents(allocateEqualCentipercent(3))).toBe(10000);
  });

  it("builds controlled percentage state keyed by sorted user id", () => {
    const state = equalPercentageState(["c", "a", "b"]);
    expect(state).toEqual({
      a: "33.34",
      b: "33.33",
      c: "33.33",
    });
    const total = Object.values(state).reduce(
      (sum, value) => sum + Math.round(Number(value) * 100),
      0
    );
    expect(total).toBe(10000);
  });
});

describe("calculateSplits", () => {
  it("splits $100 equally by sorted user id (not form order)", () => {
    // Form order c,a,b — remainder must follow sorted a,b,c
    const splits = calculateSplits(100, "equal", [
      { userId: "c" },
      { userId: "a" },
      { userId: "b" },
    ]);

    expect(splits.map((s) => s.userId)).toEqual(["a", "b", "c"]);
    expect(splits.map((s) => s.shareAmountCents)).toEqual([3334, 3333, 3333]);
    expect(sumCents(splits.map((s) => s.shareAmountCents))).toBe(10000);
    expect(
      sumCents(splits.map((s) => Math.round((s.sharePercentage ?? 0) * 100)))
    ).toBe(10000);
  });

  it("ignores form order for equal remainder", () => {
    const forward = calculateSplits(100, "equal", [
      { userId: "a" },
      { userId: "b" },
      { userId: "c" },
    ]);
    const reversed = calculateSplits(100, "equal", [
      { userId: "c" },
      { userId: "b" },
      { userId: "a" },
    ]);
    expect(forward.map((s) => s.shareAmountCents)).toEqual(
      reversed.map((s) => s.shareAmountCents)
    );
  });

  it("validates exact totals", () => {
    expect(() =>
      calculateSplits(10, "exact", [
        { userId: "a", exactAmountCents: 400 },
        { userId: "b", exactAmountCents: 500 },
      ])
    ).toThrow(SplitValidationError);

    const ok = calculateSplits(10, "exact", [
      { userId: "a", exactAmountCents: 400 },
      { userId: "b", exactAmountCents: 600 },
    ]);
    expect(sumCents(ok.map((s) => s.shareAmountCents))).toBe(1000);
  });

  it("validates percentages and conserves cents by sorted user id", () => {
    expect(() =>
      calculateSplits(100, "percentage", [
        { userId: "a", percentageCentipercent: 5000 },
        { userId: "b", percentageCentipercent: 4000 },
      ])
    ).toThrow(/100%/);

    const splits = calculateSplits(100, "percentage", [
      { userId: "c", percentageCentipercent: 3334 },
      { userId: "a", percentageCentipercent: 3333 },
      { userId: "b", percentageCentipercent: 3333 },
    ]);
    expect(splits.map((s) => s.userId)).toEqual(["a", "b", "c"]);
    expect(sumCents(splits.map((s) => s.shareAmountCents))).toBe(10000);
  });

  it("rejects zero/negative amounts", () => {
    expect(() => calculateSplits(0, "equal", [{ userId: "a" }])).toThrow(
      /greater than zero/i
    );
  });
});
