export const DINER_HISTORY_STORAGE_KEY = "tipwell:diner-history";
export const MAX_DINER_HISTORY_ITEMS = 6;

export type DinerHistorySnapshot = {
  subtotalInput: string;
  peopleInput: string;
  tipPercentInput: string;
  tipMode: "preset" | "custom";
  tipBase: string;
  roundUpMode: string;
  region: "us" | "ca";
  advancedOpen: boolean;
  itemsSubtotalInput: string;
  discountInput: string;
  feesInput: string;
  taxMode: "amount" | "rate";
  taxAmountInput: string;
  taxRateInput: string;
  serviceChargeIncluded: boolean;
  serviceChargeInput: string;
  reverseTipInput: string;
};

export type DinerHistoryItem = {
  id: string;
  savedAt: string;
  snapshot: DinerHistorySnapshot;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSnapshot(value: unknown): value is DinerHistorySnapshot {
  if (!isRecord(value)) return false;
  const stringKeys = ["subtotalInput", "peopleInput", "tipPercentInput", "tipMode", "tipBase", "roundUpMode", "region", "itemsSubtotalInput", "discountInput", "feesInput", "taxMode", "taxAmountInput", "taxRateInput", "serviceChargeInput", "reverseTipInput"];
  return stringKeys.every((key) => typeof value[key] === "string")
    && typeof value.advancedOpen === "boolean"
    && typeof value.serviceChargeIncluded === "boolean"
    && (value.tipMode === "preset" || value.tipMode === "custom")
    && (value.taxMode === "amount" || value.taxMode === "rate")
    && (value.region === "us" || value.region === "ca");
}

export function readDinerHistory(raw: string | null): DinerHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DinerHistoryItem => isRecord(item)
      && typeof item.id === "string"
      && typeof item.savedAt === "string"
      && isSnapshot(item.snapshot)).slice(0, MAX_DINER_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function addDinerHistoryItem(items: DinerHistoryItem[], item: DinerHistoryItem): DinerHistoryItem[] {
  return [item, ...items.filter((existing) => existing.id !== item.id)].slice(0, MAX_DINER_HISTORY_ITEMS);
}
