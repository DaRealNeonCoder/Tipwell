import { describe, expect, it } from "vitest";
import { addDinerHistoryItem, MAX_DINER_HISTORY_ITEMS, readDinerHistory, type DinerHistoryItem } from "./diner-history";

const snapshot = {
  subtotalInput: "84.60",
  peopleInput: "2",
  tipPercentInput: "18",
  tipMode: "preset" as const,
  tipBase: "pre-tax",
  roundUpMode: "none",
  region: "us" as const,
  advancedOpen: false,
  itemsSubtotalInput: "",
  discountInput: "0.00",
  feesInput: "0.00",
  taxMode: "amount" as const,
  taxAmountInput: "0.00",
  taxRateInput: "0",
  serviceChargeIncluded: false,
  serviceChargeInput: "0.00",
  reverseTipInput: "0.00",
};

function item(id: string): DinerHistoryItem {
  return { id, savedAt: "2026-10-24T00:00:00.000Z", snapshot };
}

describe("diner history", () => {
  it("ignores malformed browser storage", () => {
    expect(readDinerHistory("not json")).toEqual([]);
    expect(readDinerHistory(JSON.stringify([{ id: "bad" }]))).toEqual([]);
  });

  it("puts new bills first and keeps the list bounded", () => {
    const history = Array.from({ length: MAX_DINER_HISTORY_ITEMS }, (_, index) => item(String(index)));
    const updated = addDinerHistoryItem(history, item("new"));
    expect(updated).toHaveLength(MAX_DINER_HISTORY_ITEMS);
    expect(updated[0]?.id).toBe("new");
    expect(updated.some((entry) => entry.id === String(MAX_DINER_HISTORY_ITEMS - 1))).toBe(false);
  });
});
