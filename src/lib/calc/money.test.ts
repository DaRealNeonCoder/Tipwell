import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  formatCents,
  parseMoneyToCents,
  roundHalfUp,
  sumCents,
} from "./money";

describe("money helpers", () => {
  it("keeps money as integer cents and rounds fractional cents half-up", () => {
    expect(dollarsToCents(12.34)).toBe(1234);
    expect(dollarsToCents(1.005)).toBe(101);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-2.5)).toBe(-3);
  });

  it("safely parses common money input and rejects invalid input", () => {
    expect(parseMoneyToCents("$1,234.567")).toBe(123457);
    expect(parseMoneyToCents("(12.50)")).toBe(-1250);
    expect(parseMoneyToCents("-$5")).toBe(-500);
    expect(parseMoneyToCents("  8.2 ")).toBe(820);
    expect(parseMoneyToCents("not a price")).toBeNull();
    expect(parseMoneyToCents("$12.3oops")).toBeNull();
    expect(parseMoneyToCents(Number.NaN)).toBeNull();
  });

  it("formats cents without allowing floating point money drift", () => {
    expect(formatCents(1234)).toBe("$12.34");
    expect(formatCents(-5)).toBe("-$0.05");
    expect(sumCents(Array.from({ length: 100 }, () => 1))).toBe(100);
    expect(sumCents([199, 1, 300])).toBe(500);
  });
});
