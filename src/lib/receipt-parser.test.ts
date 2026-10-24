import { describe, expect, it } from "vitest";
import { parseReceiptText } from "./receipt-parser";

describe("receipt parser", () => {
  it("extracts item names and prices while ignoring receipt totals", () => {
    expect(parseReceiptText("Burger 12.50\nShared fries $6.00\nSubtotal 18.50\nTax 1.50\nTotal 20.00")).toEqual([
      { name: "Burger", price: "12.50" },
      { name: "Shared fries", price: "6.00" },
    ]);
  });
});
