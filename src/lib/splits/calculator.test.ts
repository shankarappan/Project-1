import { describe, expect, it } from "vitest";
import { calculateSplits, SplitValidationError } from "./calculator";
import { sumCents } from "@/lib/money/cents";

describe("calculateSplits", () => {
  it("splits $100 equally across 3 with conserved cents", () => {
    const splits = calculateSplits(100, "equal", [
      { userId: "a" },
      { userId: "b" },
      { userId: "c" },
    ]);

    expect(splits.map((s) => s.shareAmountCents)).toEqual([3333, 3333, 3334]);
    expect(sumCents(splits.map((s) => s.shareAmountCents))).toBe(10000);
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

  it("validates percentages and assigns remainder to last", () => {
    expect(() =>
      calculateSplits(100, "percentage", [
        { userId: "a", percentageCentipercent: 5000 },
        { userId: "b", percentageCentipercent: 4000 },
      ])
    ).toThrow(/100%/);

    const splits = calculateSplits(100, "percentage", [
      { userId: "a", percentageCentipercent: 3333 },
      { userId: "b", percentageCentipercent: 3333 },
      { userId: "c", percentageCentipercent: 3334 },
    ]);
    expect(sumCents(splits.map((s) => s.shareAmountCents))).toBe(10000);
  });

  it("rejects zero/negative amounts", () => {
    expect(() => calculateSplits(0, "equal", [{ userId: "a" }])).toThrow(
      /greater than zero/i
    );
  });
});
