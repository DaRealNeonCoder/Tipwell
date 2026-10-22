import {
  asCents,
  type Cents,
  percentageOfCents,
  roundHalfUp,
  sumCents,
} from "./money";
import { splitEvenly } from "./split";

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

export type RoundUpMode = "none" | "total_to_dollar" | "per_person_to_dollar";

export interface DinerCalculationInput {
  subtotalCents: Cents;
  tipPercent: number;
  people: number;
  roundUpMode?: RoundUpMode;
}

export interface DinerCalculation {
  baseTipCents: Cents;
  tipCents: Cents;
  roundingCents: Cents;
  totalCents: Cents;
  perPersonCents: Cents[];
}

export type TaxInputMode = "amount" | "rate";

export interface DinerDecoderInput {
  itemsSubtotalCents: Cents;
  discountCents?: Cents;
  feesCents?: Cents;
  taxMode?: TaxInputMode;
  taxCents?: Cents;
  taxRate?: number;
  serviceChargeCents?: Cents;
  base: DinerTipBase | string;
  tipPercent: number;
}

export interface DinerDecoderResult {
  bill: DinerBill;
  taxCents: Cents;
  tipCents: Cents;
  tipBaseCents: Cents;
  preTaxTipCents: Cents;
  effectiveFoodPercent: number | null;
  differenceVsPreTaxCents: Cents;
  serviceChargePercent: number | null;
  serviceChargeWarning: boolean;
  combinedEffectivePercent: number | null;
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

function validateDinerCalculationInput({
  subtotalCents,
  tipPercent,
  people,
}: DinerCalculationInput): void {
  asCents(subtotalCents);
  if (subtotalCents < 0) {
    throw new RangeError("Subtotal cannot be negative");
  }
  if (!Number.isFinite(tipPercent) || tipPercent < 0) {
    throw new RangeError("Tip percentage must be finite and non-negative");
  }
  if (!Number.isInteger(people) || people <= 0) {
    throw new RangeError("People must be a positive integer");
  }
}

/** Calculate a diner total, including optional whole-dollar round-up modes. */
export function calculateDinerCalculation({
  subtotalCents,
  tipPercent,
  people,
  roundUpMode = "none",
}: DinerCalculationInput): DinerCalculation {
  validateDinerCalculationInput({ subtotalCents, tipPercent, people });
  if (!["none", "total_to_dollar", "per_person_to_dollar"].includes(roundUpMode)) {
    throw new RangeError(`Unknown round-up mode: ${roundUpMode}`);
  }

  const baseTipCents = calculateDinerTipCents({
    bill: { subtotalCents, taxCents: 0 },
    base: "pre-tax",
    tipPercent,
  });
  const baseTotalCents = subtotalCents + baseTipCents;

  if (roundUpMode === "per_person_to_dollar") {
    const exactShares = splitEvenly(baseTotalCents, people);
    const perPersonCents = exactShares.map((share) => share + roundUpCents(share));
    const totalCents = sumCents(perPersonCents);
    return {
      baseTipCents,
      tipCents: totalCents - subtotalCents,
      roundingCents: totalCents - baseTotalCents,
      totalCents,
      perPersonCents,
    };
  }

  const roundingCents = roundUpMode === "total_to_dollar" ? roundUpCents(baseTotalCents) : 0;
  const totalCents = baseTotalCents + roundingCents;
  return {
    baseTipCents,
    tipCents: totalCents - subtotalCents,
    roundingCents,
    totalCents,
    perPersonCents: splitEvenly(totalCents, people),
  };
}

/** Decode a bill and report the tip's food rate, tax difference, and fees. */
export function calculateDinerDecoder({
  itemsSubtotalCents,
  discountCents = 0,
  feesCents = 0,
  taxMode = "amount",
  taxCents = 0,
  taxRate = 0,
  serviceChargeCents = 0,
  base,
  tipPercent,
}: DinerDecoderInput): DinerDecoderResult {
  asCents(itemsSubtotalCents);
  asCents(discountCents);
  asCents(feesCents);
  asCents(taxCents);
  asCents(serviceChargeCents);
  if (itemsSubtotalCents < 0 || discountCents < 0 || feesCents < 0 || taxCents < 0 || serviceChargeCents < 0) {
    throw new RangeError("Bill amounts cannot be negative");
  }
  if (discountCents > itemsSubtotalCents) {
    throw new RangeError("Discount cannot exceed the items subtotal");
  }
  if (!Number.isFinite(taxRate) || taxRate < 0) {
    throw new RangeError("Tax rate must be finite and non-negative");
  }
  if (taxMode !== "amount" && taxMode !== "rate") {
    throw new RangeError(`Unknown tax mode: ${taxMode}`);
  }

  const preTaxCents = itemsSubtotalCents - discountCents;
  const decodedTaxCents = taxMode === "rate" ? percentageOfCents(preTaxCents, taxRate) : taxCents;
  const bill: DinerBill = {
    itemsSubtotalCents,
    discountCents,
    feesCents,
    taxCents: decodedTaxCents,
    serviceChargeCents,
  };
  const tipCents = calculateDinerTipCents({ bill, base, tipPercent });
  const preTaxTipCents = calculateDinerTipCents({ bill, base: "pre-tax", tipPercent });

  return {
    bill,
    taxCents: decodedTaxCents,
    tipCents,
    tipBaseCents: getDinerTipBaseCents(bill, base),
    preTaxTipCents,
    effectiveFoodPercent: reverseLookupTipPercent(tipCents, bill, "pre-discount"),
    differenceVsPreTaxCents: tipCents - preTaxTipCents,
    serviceChargePercent: serviceChargeEffectivePercent(serviceChargeCents, itemsSubtotalCents),
    serviceChargeWarning: serviceChargeCents > 0,
    combinedEffectivePercent: combinedEffectivePercent(serviceChargeCents, tipCents, itemsSubtotalCents),
  };
}

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
