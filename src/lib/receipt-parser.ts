export type ReceiptLineItem = { name: string; price: string };
export const RECEIPT_ITEMS_STORAGE_KEY = "tipwell:receipt-items";

const PRICE_AT_END = /(?:\$\s*)?(\d{1,4}(?:[,.]\d{2}))\s*$/;

export function parseReceiptText(text: string): ReceiptLineItem[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const match = line.match(PRICE_AT_END);
    if (!match) return [];
    const name = line.slice(0, match.index).replace(/[|*_]+/g, " ").replace(/\s+/g, " ").trim();
    const price = match[1].replace(",", ".");
    if (!name || /^(subtotal|total|tax|tip|discount|balance|amount due)$/i.test(name)) return [];
    return [{ name, price }];
  });
}
