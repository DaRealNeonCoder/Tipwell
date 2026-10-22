import {
  asCents,
  type Cents,
  percentageOfCents,
  roundHalfUp,
} from "./money";

export type DinerTipBase = "pre-tax" | "pre-tax-plus-fees" | "post-tax" | "pre-discount";

export interface DinerBill {
  /** Food and drink amount before discounts. */
  itemsSubtotalCents?: Cents;
  /** Legacy/net subtotal: amount after discounts and before tax. */
  subtotalCents?: Cents;
  taxCents: Cents;
  /** A positive discount amount that was removed from the original subtotal. */
  discountCents?: Cents;
  feesCents?: Cents;
  serviceChargeCents?: Cents;
}

export interface TipCalculationInput {
  bill: DinerBill;
  base: DinerTipBase | string;
  tipPercent: number;
}

const TIP_BASE_ALIASES: Record<string, DinerTipBase> = {
  "pre-tax": "pre-tax",
  "pre-tax-plus-fees": "pre-tax-plus-fees",
  "pre tax plus fees": "pre-tax-plus-fees",
  "pre-tax+fees": "pre-tax-plus-fees",
  "pre_tax_plus_fees": "pre-tax-plus-fees",
  "pre tax + fees": "pre-tax-plus-fees",
  pretax: "pre-tax",
  "pre tax": "pre-tax",
  subtotal: "pre-tax",
  "before tax": "pre-tax",
  "post-tax": "post-tax",
  posttax: "post-tax",
  "post tax": "post-tax",
  total: "post-tax",
  "after tax": "post-tax",
  "pre-discount": "pre-discount",
  prediscount: "pre-discount",
  "pre discount": "pre-discount",
  gross: "pre-discount",
  "before discount": "pre-discount",
};

function validateBill(bill: DinerBill): void {
  if (bill.itemsSubtotalCents === undefined && bill.subtotalCents === undefined) {
    throw new RangeError("A bill must include an items subtotal");
  }
  if (bill.itemsSubtotalCents !== undefined) asCents(bill.itemsSubtotalCents);
  if (bill.subtotalCents !== undefined) asCents(bill.subtotalCents);
  asCents(bill.taxCents);
  asCents(bill.discountCents ?? 0);
  asCents(bill.feesCents ?? 0);
  if (bill.serviceChargeCents !== undefined) {
    asCents(bill.serviceChargeCents);
  }
}

function getItemsSubtotalCents(bill: DinerBill): Cents {
  return bill.itemsSubtotalCents ?? (bill.subtotalCents ?? 0) + (bill.discountCents ?? 0);
}

function getPreTaxCents(bill: DinerBill): Cents {
  return bill.itemsSubtotalCents === undefined
    ? bill.subtotalCents ?? 0
    : bill.itemsSubtotalCents - (bill.discountCents ?? 0);
}

/** Decode UI-friendly labels into the small set of supported tip bases. */
export function decodeTipBase(value: string | null | undefined): DinerTipBase | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  return TIP_BASE_ALIASES[normalized] ?? null;
}

/** Return the amount on which a diner's tip should be calculated. */
export function getDinerTipBaseCents(bill: DinerBill, base: DinerTipBase | string): Cents {
  validateBill(bill);
  const decodedBase = decodeTipBase(base);
  if (!decodedBase) {
    throw new RangeError(`Unknown tip base: ${base}`);
  }

  switch (decodedBase) {
    case "pre-tax":
      return getPreTaxCents(bill);
    case "pre-tax-plus-fees":
      return getPreTaxCents(bill) + (bill.feesCents ?? 0);
    case "post-tax":
      return getPreTaxCents(bill) + (bill.feesCents ?? 0) + bill.taxCents;
    case "pre-discount":
      return getItemsSubtotalCents(bill);
  }
}

export const dinerTipBaseCents = getDinerTipBaseCents;

/** Calculate a tip in cents from a selected base and percentage. */
export function calculateDinerTipCents({
  bill,
  base,
  tipPercent,
}: TipCalculationInput): Cents {
  return percentageOfCents(getDinerTipBaseCents(bill, base), tipPercent);
}

export const calculateTipCents = calculateDinerTipCents;

/**
 * Reverse a tip amount into its effective percentage of a selected base.
 * null represents a zero base, where no percentage can be inferred.
 */
export function reverseLookupTipPercent(
  tipCents: Cents,
  bill: DinerBill,
  base: DinerTipBase | string,
): number | null {
  asCents(tipCents);
  const baseCents = getDinerTipBaseCents(bill, base);
  if (baseCents === 0) {
    return null;
  }
  return (tipCents / baseCents) * 100;
}

export const getTipPercentFromAmount = reverseLookupTipPercent;

export interface TipBaseMatch {
  base: DinerTipBase;
  percent: number | null;
  matchedPreset: number | null;
}

/** Reverse a payment-screen suggestion across every supported tip base. */
export function lookupTipScreenAmount(
  tipCents: Cents,
  bill: DinerBill,
  presets: readonly number[] = [15, 18, 20, 25],
): TipBaseMatch[] {
  const bases: DinerTipBase[] = ["pre-tax", "pre-tax-plus-fees", "pre-discount", "post-tax"];
  return bases.map((base) => {
    const percent = reverseLookupTipPercent(tipCents, bill, base);
    const matchedPreset = percent === null
      ? null
      : presets.find((preset) => Math.abs(percent - preset) < 0.005) ?? null;
    return { base, percent, matchedPreset };
  });
}

/** Calculate the effective rate of a service charge over any bill base. */
export function serviceChargeEffectivePercent(
  serviceChargeCents: Cents,
  baseCents: Cents,
): number | null {
  asCents(serviceChargeCents);
  asCents(baseCents);
  if (baseCents === 0) {
    return null;
  }
  return (serviceChargeCents / baseCents) * 100;
}

export const calculateServiceChargeEffectivePercent = serviceChargeEffectivePercent;

/** Effective combined rate of an included service charge and a new tip. */
export function combinedEffectivePercent(
  serviceChargeCents: Cents,
  tipCents: Cents,
  itemsSubtotalCents: Cents,
): number | null {
  asCents(serviceChargeCents);
  asCents(tipCents);
  asCents(itemsSubtotalCents);
  if (itemsSubtotalCents === 0) return null;
  return ((serviceChargeCents + tipCents) / itemsSubtotalCents) * 100;
}

/** Return the amount needed to bring a total up to the next increment. */
export function roundUpCents(totalCents: Cents, incrementCents = 100): Cents {
  asCents(totalCents);
  asCents(incrementCents);
  if (totalCents < 0 || incrementCents <= 0) {
    throw new RangeError("Round-up values must be non-negative and the increment must be positive");
  }
  return (incrementCents - (totalCents % incrementCents)) % incrementCents;
}

/** Tip required to round a diner's final bill to a whole-dollar (or custom) total. */
export function calculateRoundUpTipCents(
  totalCents: Cents,
  incrementCents = 100,
): Cents {
  return roundUpCents(totalCents, incrementCents);
}

export const roundUpTipCents = calculateRoundUpTipCents;

/** Round a derived percentage for display while retaining calculation precision. */
export function roundTipPercentForDisplay(percent: number, decimalPlaces = 2): number {
  return roundHalfUp(percent, decimalPlaces);
}
