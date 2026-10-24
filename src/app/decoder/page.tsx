"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  calculateDinerDecoder,
  lookupTipScreenAmount,
  formatCents,
  parseMoneyToCents,
  roundTipPercentForDisplay,
  type DinerTipBase,
  type TaxInputMode,
} from "@/lib/calc";
import AppHeader from "@/components/app-header";
import ServiceWorkerRegistration from "../service-worker-registration";

const BASE_LABELS: Record<DinerTipBase, string> = {
  "pre-tax": "Pre-tax",
  "pre-tax-plus-fees": "Pre-tax + fees",
  "pre-discount": "Pre-discount",
  "post-tax": "Post-tax",
};

function parseNonNegativeMoney(value: string): number | null {
  const cents = parseMoneyToCents(value);
  return cents !== null && cents >= 0 ? cents : null;
}

function parseOptionalMoney(value: string): number | null {
  return value.trim() === "" ? 0 : parseNonNegativeMoney(value);
}

function percentText(value: number | null): string {
  return value === null ? "—" : `${roundTipPercentForDisplay(value)}%`;
}

export default function DecoderPage() {
  const [itemsSubtotalInput, setItemsSubtotalInput] = useState("84.60");
  const [discountInput, setDiscountInput] = useState("0.00");
  const [feesInput, setFeesInput] = useState("0.00");
  const [taxMode, setTaxMode] = useState<TaxInputMode>("amount");
  const [taxAmountInput, setTaxAmountInput] = useState("0.00");
  const [taxRateInput, setTaxRateInput] = useState("0");
  const [serviceChargeIncluded, setServiceChargeIncluded] = useState(false);
  const [serviceChargeInput, setServiceChargeInput] = useState("0.00");
  const [tipBase, setTipBase] = useState<DinerTipBase>("pre-tax");
  const [tipPercentInput, setTipPercentInput] = useState("18");
  const [reverseTipInput, setReverseTipInput] = useState("0.00");

  const tipPercent = Number(tipPercentInput);
  const values = useMemo(() => {
    const itemsSubtotalCents = parseNonNegativeMoney(itemsSubtotalInput);
    const discountCents = parseOptionalMoney(discountInput);
    const feesCents = parseOptionalMoney(feesInput);
    const taxCents = parseOptionalMoney(taxAmountInput);
    const serviceChargeCents = serviceChargeIncluded ? parseOptionalMoney(serviceChargeInput) : 0;
    const taxRate = taxRateInput.trim() === "" ? 0 : Number(taxRateInput);
    let error: string | null = null;
    if (itemsSubtotalCents === null) error = "Enter a valid items subtotal.";
    else if (discountCents === null || feesCents === null || taxCents === null || serviceChargeCents === null) error = "Use valid non-negative amounts in the decoder.";
    else if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) error = "Tax rate must be between 0 and 100.";
    else if (discountCents > itemsSubtotalCents) error = "Discount cannot exceed the items subtotal.";
    else if (!Number.isFinite(tipPercent) || tipPercent < 0 || tipPercent > 100) error = "Tip percentage must be between 0 and 100.";
    if (error || itemsSubtotalCents === null || discountCents === null || feesCents === null || taxCents === null || serviceChargeCents === null) return { error, result: null };
    try {
      return { error: null, result: calculateDinerDecoder({ itemsSubtotalCents, discountCents, feesCents, taxMode, taxCents, taxRate, serviceChargeCents, base: tipBase, tipPercent }) };
    } catch (decoderError) {
      return { error: decoderError instanceof Error ? decoderError.message : "Check the decoder values.", result: null };
    }
  }, [discountInput, feesInput, itemsSubtotalInput, serviceChargeIncluded, serviceChargeInput, taxAmountInput, taxMode, taxRateInput, tipBase, tipPercent]);

  const reverseLookup = useMemo(() => {
    const amountCents = parseNonNegativeMoney(reverseTipInput);
    if (amountCents === null || !values.result) return null;
    return lookupTipScreenAmount(amountCents, values.result.bill);
  }, [reverseTipInput, values.result]);

  const money = (cents: number) => formatCents(cents, "USD", "en-US");

  return (
    <main className="app-shell">
      <ServiceWorkerRegistration />
      <div className="app-container narrow-container">
        <AppHeader />
        <section className="hero-copy compact-hero" aria-labelledby="decoder-title"><p className="eyebrow accent">Diner tool</p><h1 id="decoder-title">Read the receipt<br /><em>more clearly.</em></h1><p>Reconstruct a receipt when the payment screen is less than clear, then compare what each tip base means.</p></section>
        <Link className="back-link" href="/">← Back to diner calculator</Link>
        <section className="calculator-card decoder-page-card" aria-labelledby="decoder-card-title">
          <div className="section-heading"><div><p className="eyebrow">Advanced decoder</p><h2 id="decoder-card-title">Receipt details</h2></div><span className="privacy-pill">Private on this device</span></div>
          <div className="decoder-grid">
            <div className="field field-wide"><label htmlFor="items-subtotal">Items subtotal</label><div className="money-input"><span aria-hidden="true">$</span><input id="items-subtotal" inputMode="decimal" value={itemsSubtotalInput} onChange={(event) => setItemsSubtotalInput(event.target.value)} /></div></div>
            <div className="field"><label htmlFor="discount">Discount</label><div className="money-input"><span aria-hidden="true">$</span><input id="discount" inputMode="decimal" value={discountInput} onChange={(event) => setDiscountInput(event.target.value)} /></div></div>
            <div className="field"><label htmlFor="fees">Fees</label><div className="money-input"><span aria-hidden="true">$</span><input id="fees" inputMode="decimal" value={feesInput} onChange={(event) => setFeesInput(event.target.value)} /></div></div>
            <fieldset className="field tax-field"><legend>Tax</legend><div className="segmented-control"><button type="button" className={taxMode === "amount" ? "active" : ""} onClick={() => setTaxMode("amount")} aria-pressed={taxMode === "amount"}>Amount</button><button type="button" className={taxMode === "rate" ? "active" : ""} onClick={() => setTaxMode("rate")} aria-pressed={taxMode === "rate"}>Rate</button></div>{taxMode === "amount" ? <div className="money-input"><span aria-hidden="true">$</span><input id="tax-amount" aria-label="Tax amount" inputMode="decimal" value={taxAmountInput} onChange={(event) => setTaxAmountInput(event.target.value)} /></div> : <div className="percent-input"><input id="tax-rate" aria-label="Tax rate" type="number" min="0" max="100" step="0.01" value={taxRateInput} onChange={(event) => setTaxRateInput(event.target.value)} /><span aria-hidden="true">%</span></div>}</fieldset>
            <div className="field field-wide"><label className="checkbox-label"><input type="checkbox" checked={serviceChargeIncluded} onChange={(event) => setServiceChargeIncluded(event.target.checked)} /><span>Service charge included</span></label>{serviceChargeIncluded && <div className="money-input"><span aria-hidden="true">$</span><input id="service-charge" aria-label="Service charge amount" inputMode="decimal" value={serviceChargeInput} onChange={(event) => setServiceChargeInput(event.target.value)} /></div>}</div>
          </div>
          <div className="decoder-controls"><div className="field"><label htmlFor="tip-base">Tip base</label><select id="tip-base" value={tipBase} onChange={(event) => setTipBase(event.target.value as DinerTipBase)}>{Object.entries(BASE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="field"><label htmlFor="decoder-tip-percent">Tip percentage</label><div className="percent-input"><input id="decoder-tip-percent" type="number" min="0" max="100" step="0.5" value={tipPercentInput} onChange={(event) => setTipPercentInput(event.target.value)} /><span aria-hidden="true">%</span></div></div></div>
          <p className={`validation-message ${values.error ? "visible" : ""}`} role="alert">{values.error ?? " "}</p>
          {values.result && <div className="decoder-result" aria-live="polite" aria-atomic="true"><div className="decoder-result-heading"><div><p className="eyebrow">Decoded result</p><h3>{money(values.result.tipCents)} tip</h3></div><span className="base-badge">{BASE_LABELS[tipBase]}</span></div><dl className="metrics-list"><div><dt>Tip base</dt><dd>{money(values.result.tipBaseCents)}</dd></div><div><dt>Effective food %</dt><dd>{percentText(values.result.effectiveFoodPercent)}</dd></div><div><dt>Difference vs pre-tax</dt><dd className={values.result.differenceVsPreTaxCents > 0 ? "positive" : ""}>{values.result.differenceVsPreTaxCents > 0 ? "+" : ""}{money(values.result.differenceVsPreTaxCents)}</dd></div><div><dt>Tax used</dt><dd>{money(values.result.taxCents)}</dd></div></dl>{values.result.serviceChargeWarning && <div className="warning-callout" role="note"><strong>Service charge detected</strong><span>{percentText(values.result.serviceChargePercent)} of food · combined effective rate {percentText(values.result.combinedEffectivePercent)}</span></div>}</div>}
          <div className="reverse-lookup"><div className="section-heading compact"><div><p className="eyebrow">Payment screen check</p><h3>What tip did they suggest?</h3></div></div><p className="section-intro">Enter the tip amount from a payment screen to see what percentage it represents on each common base.</p><div className="reverse-input-row"><label htmlFor="reverse-tip">Tip amount</label><div className="money-input"><span aria-hidden="true">$</span><input id="reverse-tip" inputMode="decimal" value={reverseTipInput} onChange={(event) => setReverseTipInput(event.target.value)} /></div></div>{reverseLookup && <div className="lookup-grid" aria-live="polite">{reverseLookup.map((match) => <div className="lookup-item" key={match.base}><span>{BASE_LABELS[match.base]}</span><strong>{percentText(match.percent)}</strong>{match.matchedPreset !== null && <small>matches {match.matchedPreset}%</small>}</div>)}</div>}{!reverseLookup && <p className="field-help">Enter a valid tip amount to activate the lookup.</p>}</div>
        </section>
        <footer className="app-footer"><Link href="/">Diner calculator</Link><Link href="/worker">Worker tools</Link></footer>
      </div>
    </main>
  );
}
