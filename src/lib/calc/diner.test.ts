import { describe, expect, it } from "vitest";
import {
  calculateDinerTipCents,
  calculateRoundUpTipCents,
  decodeTipBase,
  getDinerTipBaseCents,
  reverseLookupTipPercent,
  serviceChargeEffectivePercent,
} from "./diner";

const bill = {
  subtotalCents: 10_000,
  taxCents: 875,
  discountCents: 1_000,
  serviceChargeCents: 1_500,
};

describe("diner calculations", () => {
  it("decodes and calculates pre-tax, post-tax, and pre-discount bases", () => {
    expect(decodeTipBase("pre_tax")).toBe("pre-tax");
    expect(decodeTipBase("after tax")).toBe("post-tax");
    expect(decodeTipBase("gross")).toBe("pre-discount");
    expect(getDinerTipBaseCents(bill, "pre-tax")).toBe(10_000);
    expect(getDinerTipBaseCents(bill, "post-tax")).toBe(10_875);
    expect(getDinerTipBaseCents(bill, "pre-discount")).toBe(11_000);
    expect(calculateDinerTipCents({ bill, base: "pre-tax", tipPercent: 20 })).toBe(2_000);
    expect(calculateDinerTipCents({ bill, base: "post-tax", tipPercent: 20 })).toBe(2_175);
  });

  it("supports a pre-discount tip and computes service charge effective percentage", () => {
    expect(calculateDinerTipCents({ bill, base: "pre-discount", tipPercent: 20 })).toBe(2_200);
    expect(serviceChargeEffectivePercent(1_500, bill.subtotalCents ?? 0)).toBe(15);
    expect(serviceChargeEffectivePercent(1_500, 0)).toBeNull();
  });

  it("supports fees and the bill-decoder examples", () => {
    const decoderBill = {
      itemsSubtotalCents: 8_000,
      discountCents: 0,
      feesCents: 0,
      taxCents: 640,
    };
    expect(getDinerTipBaseCents(decoderBill, "pre_tax")).toBe(8_000);
    expect(getDinerTipBaseCents(decoderBill, "post_tax")).toBe(8_640);
    expect(calculateDinerTipCents({ bill: decoderBill, base: "pre_tax", tipPercent: 20 })).toBe(1_600);
    expect(calculateDinerTipCents({ bill: decoderBill, base: "post_tax", tipPercent: 20 })).toBe(1_728);
    expect(
      calculateDinerTipCents({
        bill: { itemsSubtotalCents: 10_000, discountCents: 2_000, feesCents: 0, taxCents: 0 },
        base: "pre_discount",
        tipPercent: 20,
      }),
    ).toBe(2_000);
    expect(
      getDinerTipBaseCents(
        { itemsSubtotalCents: 10_000, discountCents: 1_000, feesCents: 250, taxCents: 0 },
        "pre_tax_plus_fees",
      ),
    ).toBe(9_250);
  });

  it("reverse-lookups a percentage from a tip amount", () => {
    expect(reverseLookupTipPercent(2_000, bill, "pre-tax")).toBe(20);
    expect(reverseLookupTipPercent(1_000, bill, "post-tax")).toBeCloseTo(9.1954022988);
    expect(reverseLookupTipPercent(10, { subtotalCents: 0, taxCents: 0 }, "pre-tax")).toBeNull();
  });

  it("calculates a round-up tip without adding a tip to an exact total", () => {
    expect(calculateRoundUpTipCents(4_387)).toBe(13);
    expect(calculateRoundUpTipCents(4_400)).toBe(0);
    expect(calculateRoundUpTipCents(1_237, 25)).toBe(13);
  });
});
