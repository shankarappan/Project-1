import { describe, expect, it } from "vitest";
import {
  MAX_AMOUNT_CENTS,
  MoneyParseError,
  centsToDollars,
  dollarsToCents,
  parseMoneyToCents,
  parsePercentageToCentipercent,
  sumCents,
} from "./cents";

describe("money cents helpers", () => {
  it("parses dollars to cents without float drift", () => {
    expect(parseMoneyToCents("100")).toBe(10000);
    expect(parseMoneyToCents("100.00")).toBe(10000);
    expect(parseMoneyToCents("0.1")).toBe(10);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
  });

  it("rejects blank, negative, and invalid money", () => {
    expect(() => parseMoneyToCents("")).toThrow(MoneyParseError);
    expect(() => parseMoneyToCents("-1")).toThrow(MoneyParseError);
    expect(() => parseMoneyToCents("12.345")).toThrow(MoneyParseError);
    expect(() => parseMoneyToCents("abc")).toThrow(MoneyParseError);
  });

  it("handles very large amounts up to numeric(12,2)", () => {
    expect(parseMoneyToCents("9999999999.99")).toBe(MAX_AMOUNT_CENTS);
    expect(() => parseMoneyToCents("10000000000.00")).toThrow(MoneyParseError);
  });

  it("round-trips via dollarsToCents / centsToDollars", () => {
    expect(dollarsToCents(33.33)).toBe(3333);
    expect(centsToDollars(3334)).toBe(33.34);
    expect(sumCents([3333, 3333, 3334])).toBe(10000);
  });

  it("parses percentages as centipercent", () => {
    expect(parsePercentageToCentipercent("100")).toBe(10000);
    expect(parsePercentageToCentipercent("33.33")).toBe(3333);
    expect(parsePercentageToCentipercent("33.34")).toBe(3334);
    expect(() => parsePercentageToCentipercent("")).toThrow(MoneyParseError);
    expect(() => parsePercentageToCentipercent("-1")).toThrow(MoneyParseError);
  });
});
