import { describe, expect, it } from "vitest";
import {
  centsToDollars,
  parseMoneyToCents,
  parsePercentageToCentipercent,
  sumCents,
} from "./cents";

describe("parseMoneyToCents", () => {
  it("parses common amounts without float drift", () => {
    expect(parseMoneyToCents("10.10")).toBe(1010);
    expect(parseMoneyToCents("0.01")).toBe(1);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
  });

  it("rejects invalid input", () => {
    expect(() => parseMoneyToCents("")).toThrow(/required/i);
    expect(() => parseMoneyToCents("-1")).toThrow(/negative/i);
    expect(() => parseMoneyToCents("1.234")).toThrow(/2 decimal/i);
  });
});

describe("parsePercentageToCentipercent", () => {
  it("parses percentages", () => {
    expect(parsePercentageToCentipercent("33.33")).toBe(3333);
    expect(parsePercentageToCentipercent("100")).toBe(10000);
  });
});

describe("cents helpers", () => {
  it("round-trips dollars", () => {
    expect(centsToDollars(3334)).toBe(33.34);
    expect(sumCents([3333, 3333, 3334])).toBe(10000);
  });
});
