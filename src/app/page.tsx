"use client";
/* 
*/
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  calculateDinerCalculation,
  calculateDinerDecoder,
  formatCents,
  lookupTipScreenAmount,
  parseMoneyToCents,
  roundTipPercentForDisplay,
  type DinerTipBase,
  type RoundUpMode,
  type TaxInputMode,
} from "@/lib/calc";
import { addDinerHistoryItem, DINER_HISTORY_STORAGE_KEY, readDinerHistory, type DinerHistoryItem, type DinerHistorySnapshot } from "@/lib/diner-history";
import AppHeader from "@/components/app-header";
import ServiceWorkerRegistration from "./service-worker-registration";

const STORAGE_KEY = "tipwell:diner-state";
const TIP_PRESETS = [10, 15, 20] as const;

const REGIONS = {
  us: { label: "United States · USD", currency: "USD", locale: "en-US" },
  ca: { label: "Canada · CAD", currency: "CAD", locale: "en-CA" },
} as const;

const BASE_LABELS: Record<DinerTipBase, string> = {
  "pre-tax": "Pre-tax",
  "pre-tax-plus-fees": "Pre-tax + fees",
  "pre-discount": "Pre-discount",
  "post-tax": "Post-tax",
};

const ROUND_LABELS: Record<RoundUpMode, string> = {
  none: "No round-up",
  total_to_dollar: "Round total to dollar",
  per_person_to_dollar: "Round each person to dollar",
};

type RegionKey = keyof typeof REGIONS;
type TipMode = "preset" | "custom";

interface StoredState {
  tipPercent?: number;
  tipBase?: DinerTipBase;
  region?: RegionKey;
  advancedOpen?: boolean;
}

function percentText(value: number | null): string {
  return value === null ? "—" : `${roundTipPercentForDisplay(value)}%`;
}

function parseNonNegativeMoney(value: string): number | null {
  const cents = parseMoneyToCents(value);
  return cents !== null && cents >= 0 ? cents : null;
}

function parseOptionalMoney(value: string): number | null {
  return value.trim() === "" ? 0 : parseNonNegativeMoney(value);
}

function currencySymbol(): string {
  return "$";
}

export default function HomePage() {
  const [subtotalInput, setSubtotalInput] = useState("84.60");
  const [peopleInput, setPeopleInput] = useState("2");
  const [tipPercentInput, setTipPercentInput] = useState("18");
  const [tipMode, setTipMode] = useState<TipMode>("preset");
  const [tipBase, setTipBase] = useState<DinerTipBase>("pre-tax");
  const [roundUpMode, setRoundUpMode] = useState<RoundUpMode>("none");
  const [region, setRegion] = useState<RegionKey>("us");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const subtotalRef = useRef<HTMLInputElement>(null);

  const [itemsSubtotalInput, setItemsSubtotalInput] = useState("");
  const [discountInput, setDiscountInput] = useState("0.00");
  const [feesInput, setFeesInput] = useState("0.00");
  const [taxMode, setTaxMode] = useState<TaxInputMode>("amount");
  const [taxAmountInput, setTaxAmountInput] = useState("0.00");
  const [taxRateInput, setTaxRateInput] = useState("0");
  const [serviceChargeIncluded, setServiceChargeIncluded] = useState(false);
  const [serviceChargeInput, setServiceChargeInput] = useState("0.00");
  const [reverseTipInput, setReverseTipInput] = useState("0.00");
  const [savedBills, setSavedBills] = useState<DinerHistoryItem[]>([]);

  /* Preferences are read once from the browser's external storage on mount. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const preferences = JSON.parse(saved) as StoredState;
        if (typeof preferences.tipPercent === "number" && Number.isFinite(preferences.tipPercent)) {
          setTipPercentInput(String(preferences.tipPercent));
          setTipMode(TIP_PRESETS.includes(preferences.tipPercent as (typeof TIP_PRESETS)[number]) ? "preset" : "custom");
        }
        if (preferences.tipBase && preferences.tipBase in BASE_LABELS) setTipBase(preferences.tipBase);
        if (preferences.region && preferences.region in REGIONS) setRegion(preferences.region);
        if (typeof preferences.advancedOpen === "boolean") setAdvancedOpen(preferences.advancedOpen);
      }
      setSavedBills(readDinerHistory(window.localStorage.getItem(DINER_HISTORY_STORAGE_KEY)));
    } catch {
      // A blocked or malformed preference should never prevent the calculator from opening.
    }
    setHasLoadedPreferences(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hasLoadedPreferences) return;
    const preferences: StoredState = {
      tipPercent: Number(tipPercentInput),
      tipBase,
      region,
      advancedOpen,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [advancedOpen, hasLoadedPreferences, region, tipBase, tipPercentInput]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 700px)").matches) subtotalRef.current?.focus();
  }, []);

  const money = (cents: number) => formatCents(cents, REGIONS[region].currency, REGIONS[region].locale);
  const subtotalCents = parseMoneyToCents(subtotalInput);
  const people = Number(peopleInput);
  const tipPercent = Number(tipPercentInput);
  const mainError = subtotalInput.trim() === ""
    ? "Enter a bill subtotal."
    : subtotalCents === null || subtotalCents < 0
      ? "Use a valid, non-negative amount."
      : !Number.isFinite(tipPercent) || tipPercent < 0 || tipPercent > 100
        ? "Tip percentage must be between 0 and 100."
        : !Number.isInteger(people) || people < 1
          ? "People must be a whole number greater than zero."
          : null;

  const calculation = useMemo(() => {
    if (mainError || subtotalCents === null) return null;
    try {
      return calculateDinerCalculation({ subtotalCents, tipPercent, people, roundUpMode });
    } catch {
      return null;
    }
  }, [mainError, people, roundUpMode, subtotalCents, tipPercent]);

  const advancedValues = useMemo(() => {
    const itemsSubtotalCents = itemsSubtotalInput.trim() === "" ? subtotalCents : parseNonNegativeMoney(itemsSubtotalInput);
    const discountCents = parseOptionalMoney(discountInput);
    const feesCents = parseOptionalMoney(feesInput);
    const taxCents = parseOptionalMoney(taxAmountInput);
    const serviceChargeCents = serviceChargeIncluded ? parseOptionalMoney(serviceChargeInput) : 0;
    const taxRate = taxRateInput.trim() === "" ? 0 : Number(taxRateInput);
    const invalidRate = !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100;
    let error: string | null = null;
    if (itemsSubtotalCents === null) error = "Add a valid items subtotal or a valid main subtotal first.";
    else if (discountCents === null || feesCents === null || taxCents === null || serviceChargeCents === null) error = "Use valid non-negative amounts in the decoder.";
    else if (invalidRate) error = "Tax rate must be between 0 and 100.";
    else if (discountCents > itemsSubtotalCents) error = "Discount cannot exceed the items subtotal.";
    if (error || itemsSubtotalCents === null || discountCents === null || feesCents === null || taxCents === null || serviceChargeCents === null) {
      return { error, result: null };
    }
    try {
      return {
        error: null,
        result: calculateDinerDecoder({
          itemsSubtotalCents,
          discountCents,
          feesCents,
          taxMode,
          taxCents,
          taxRate,
          serviceChargeCents,
          base: tipBase,
          tipPercent,
        }),
      };
    } catch (decoderError) {
      return { error: decoderError instanceof Error ? decoderError.message : "Check the decoder values.", result: null };
    }
  }, [discountInput, feesInput, itemsSubtotalInput, serviceChargeIncluded, serviceChargeInput, subtotalCents, taxAmountInput, taxMode, taxRateInput, tipBase, tipPercent]);

  const reverseLookup = useMemo(() => {
    const amountCents = parseNonNegativeMoney(reverseTipInput);
    if (amountCents === null || !advancedValues.result) return null;
    return lookupTipScreenAmount(amountCents, advancedValues.result.bill);
  }, [advancedValues.result, reverseTipInput]);

  function selectTip(value: number) {
    setTipPercentInput(String(value));
    setTipMode("preset");
  }

  function currentSnapshot(): DinerHistorySnapshot {
    return {
      subtotalInput,
      peopleInput,
      tipPercentInput,
      tipMode,
      tipBase,
      roundUpMode,
      region,
      advancedOpen,
      itemsSubtotalInput,
      discountInput,
      feesInput,
      taxMode,
      taxAmountInput,
      taxRateInput,
      serviceChargeIncluded,
      serviceChargeInput,
      reverseTipInput,
    };
  }

  function saveCurrentBill() {
    if (!calculation || subtotalCents === null) return;
    const item: DinerHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      snapshot: currentSnapshot(),
    };
    const next = addDinerHistoryItem(savedBills, item);
    setSavedBills(next);
    try {
      window.localStorage.setItem(DINER_HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Saving is a convenience; the calculator still works when storage is unavailable.
    }
  }

  function restoreBill(item: DinerHistoryItem) {
    const saved = item.snapshot;
    setSubtotalInput(saved.subtotalInput);
    setPeopleInput(saved.peopleInput);
    setTipPercentInput(saved.tipPercentInput);
    setTipMode(saved.tipMode);
    setTipBase(saved.tipBase as DinerTipBase);
    setRoundUpMode(saved.roundUpMode as RoundUpMode);
    setRegion(saved.region);
    setAdvancedOpen(saved.advancedOpen ?? false);
    setItemsSubtotalInput(saved.itemsSubtotalInput ?? "");
    setDiscountInput(saved.discountInput ?? "0.00");
    setFeesInput(saved.feesInput ?? "0.00");
    setTaxMode(saved.taxMode ?? "amount");
    setTaxAmountInput(saved.taxAmountInput ?? "0.00");
    setTaxRateInput(saved.taxRateInput ?? "0");
    setServiceChargeIncluded(saved.serviceChargeIncluded ?? false);
    setServiceChargeInput(saved.serviceChargeInput ?? "0.00");
    setReverseTipInput(saved.reverseTipInput ?? "0.00");
  }

  function deleteSavedBill(id: string) {
    const next = savedBills.filter((item) => item.id !== id);
    setSavedBills(next);
    try {
      window.localStorage.setItem(DINER_HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The item is still removed from the current view if storage is unavailable.
    }
  }

  return (
    <main className="app-shell">
      <ServiceWorkerRegistration />
      <div className="app-container">
        <AppHeader />
        <div className="calculator-toolbar">
            <label className="region-control">
              <span className="sr-only">Currency region</span>
              <select value={region} onChange={(event) => setRegion(event.target.value as RegionKey)}>
                {Object.entries(REGIONS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
              </select>
            </label>
        </div>

        <section className="hero-copy" aria-labelledby="page-title">
          <p className="eyebrow accent">Diner calculator</p>
          <h1 id="page-title">Split the bill.<br /><em>Keep the peace.</em></h1>
          <p>Quick, clear, and private. Your bill stays on this device.</p>
        </section>

        <section className="calculator-card" aria-labelledby="calculator-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 id="calculator-title">What was the bill?</h2>
            </div>
            <span className="privacy-pill">No account needed</span>
          </div>

          <div className="primary-fields">
            <div className="field field-large">
              <label htmlFor="subtotal">Bill subtotal</label>
              <div className="money-input">
                 <span aria-hidden="true">{currencySymbol()}</span>
                 <input ref={subtotalRef} id="subtotal" inputMode="decimal" value={subtotalInput} onChange={(event) => setSubtotalInput(event.target.value)} aria-invalid={subtotalInput.trim() === "" || subtotalCents === null || subtotalCents < 0} aria-describedby="subtotal-help main-error" />
              </div>
              <p id="subtotal-help" className="field-help">Food and drinks before tip.</p>
            </div>
            <div className="field">
              <label htmlFor="people">People</label>
              <input id="people" type="number" min="1" step="1" inputMode="numeric" value={peopleInput} onChange={(event) => setPeopleInput(event.target.value)} aria-invalid={Boolean(mainError && (!Number.isInteger(people) || people < 1))} />
              <p className="field-help">Split evenly, to the cent.</p>
            </div>
          </div>

          <fieldset className="tip-choice">
            <legend>Tip</legend>
            <div className="preset-grid">
              {TIP_PRESETS.map((preset) => (
                <button key={preset} type="button" className={`preset-button ${tipMode === "preset" && tipPercentInput === String(preset) ? "selected" : ""}`} onClick={() => selectTip(preset)} aria-pressed={tipMode === "preset" && tipPercentInput === String(preset)}>{preset}%</button>
              ))}
              <button type="button" className={`preset-button ${tipMode === "custom" ? "selected" : ""}`} onClick={() => setTipMode("custom")} aria-pressed={tipMode === "custom"}>Custom</button>
            </div>
            {tipMode === "custom" && (
              <div className="custom-tip-field">
                <label htmlFor="custom-tip">Custom tip percentage</label>
                <div className="percent-input">
                  <input id="custom-tip" type="number" min="0" max="100" step="0.5" value={tipPercentInput} onChange={(event) => setTipPercentInput(event.target.value)} aria-invalid={Boolean(mainError && (tipPercent < 0 || tipPercent > 100 || !Number.isFinite(tipPercent)))} />
                  <span aria-hidden="true">%</span>
                </div>
              </div>
            )}
          </fieldset>

          <div className="field round-up-field">
            <label htmlFor="round-up">Round-up</label>
            <select id="round-up" value={roundUpMode} onChange={(event) => setRoundUpMode(event.target.value as RoundUpMode)}>
              {Object.entries(ROUND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <p id="main-error" className={`validation-message ${mainError ? "visible" : ""}`} role="alert">{mainError ?? " "}</p>

          {calculation && (
            <div className="result-panel" aria-live="polite" aria-atomic="true">
              <div className="result-topline"><span>Your tip</span><span>{tipPercent}% tip · {ROUND_LABELS[roundUpMode]}</span></div>
              <div className="result-amount">{money(calculation.tipCents)}</div>
               {calculation.roundingCents > 0 && <p className="rounding-note">Includes {money(calculation.roundingCents)} to round up.</p>}
               <div className="result-actions"><button className="result-save-button" type="button" onClick={saveCurrentBill}>Save this bill</button><span>Keep this setup on this device</span></div>
               <div className="result-divider" />
              <div className="result-summary"><span>Total bill</span><strong>{money(calculation.totalCents)}</strong></div>
              <div className="result-summary"><span>Each of {people} people</span><strong>{money(calculation.perPersonCents[0])}{calculation.perPersonCents.some((share) => share !== calculation.perPersonCents[0]) ? "*" : ""}</strong></div>
              {calculation.perPersonCents.some((share) => share !== calculation.perPersonCents[0]) && <p className="field-help">* One or more shares differ by a cent so the total stays exact.</p>}
            </div>
          )}
         </section>

         {savedBills.length > 0 && <section className="saved-bills-section" aria-labelledby="saved-bills-title">
           <div className="section-heading compact"><div><p className="eyebrow">On this device</p><h2 id="saved-bills-title">Saved bills</h2></div><span className="privacy-pill">{savedBills.length} of 6</span></div>
           <p className="section-intro">Reuse a familiar split without retyping the receipt. Saved bills never leave this browser.</p>
           <div className="saved-bills-list">
             {savedBills.map((item) => <article className="saved-bill-row" key={item.id}>
               <div><strong>{money(parseMoneyToCents(item.snapshot.subtotalInput) ?? 0)} · {item.snapshot.peopleInput} people</strong><span>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.savedAt))}</span></div>
               <div className="row-actions"><button className="text-button" type="button" onClick={() => restoreBill(item)}>Use again</button><button className="text-button danger-text" type="button" onClick={() => deleteSavedBill(item.id)}>Delete</button></div>
             </article>)}
           </div>
         </section>}

         <section className="advanced-section" aria-labelledby="advanced-title">
          <button className="advanced-toggle" type="button" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen} aria-controls="advanced-content">
            <span><span className="eyebrow">For curious minds</span><strong id="advanced-title">Advanced bill decoder</strong></span>
            <span className={`chevron ${advancedOpen ? "open" : ""}`} aria-hidden="true">⌄</span>
          </button>
          {advancedOpen && (
            <div id="advanced-content" className="advanced-content">
              <p className="section-intro">Reconstruct a receipt when the payment screen is less than clear. Blank items subtotal uses your main subtotal.</p>
              <div className="decoder-grid">
                 <div className="field field-wide"><label htmlFor="items-subtotal">Items subtotal <span className="optional">optional</span></label><div className="money-input"><span aria-hidden="true">{currencySymbol()}</span><input id="items-subtotal" inputMode="decimal" placeholder={subtotalInput || "0.00"} value={itemsSubtotalInput} onChange={(event) => setItemsSubtotalInput(event.target.value)} /></div></div>
                 <div className="field"><label htmlFor="discount">Discount</label><div className="money-input"><span aria-hidden="true">{currencySymbol()}</span><input id="discount" inputMode="decimal" value={discountInput} onChange={(event) => setDiscountInput(event.target.value)} /></div></div>
                 <div className="field"><label htmlFor="fees">Fees</label><div className="money-input"><span aria-hidden="true">{currencySymbol()}</span><input id="fees" inputMode="decimal" value={feesInput} onChange={(event) => setFeesInput(event.target.value)} /></div></div>
                 <fieldset className="field tax-field"><legend>Tax</legend><div className="segmented-control"><button type="button" className={taxMode === "amount" ? "active" : ""} onClick={() => setTaxMode("amount")} aria-pressed={taxMode === "amount"}>Amount</button><button type="button" className={taxMode === "rate" ? "active" : ""} onClick={() => setTaxMode("rate")} aria-pressed={taxMode === "rate"}>Rate</button></div>{taxMode === "amount" ? <div className="money-input"><span aria-hidden="true">{currencySymbol()}</span><input id="tax-amount" aria-label="Tax amount" inputMode="decimal" value={taxAmountInput} onChange={(event) => setTaxAmountInput(event.target.value)} /></div> : <div className="percent-input"><input id="tax-rate" aria-label="Tax rate" type="number" min="0" max="100" step="0.01" value={taxRateInput} onChange={(event) => setTaxRateInput(event.target.value)} /><span aria-hidden="true">%</span></div>}</fieldset>
                 <div className="field field-wide"><label className="checkbox-label"><input type="checkbox" checked={serviceChargeIncluded} onChange={(event) => setServiceChargeIncluded(event.target.checked)} /><span>Service charge included</span></label>{serviceChargeIncluded && <div className="money-input"><span aria-hidden="true">{currencySymbol()}</span><input id="service-charge" aria-label="Service charge amount" inputMode="decimal" value={serviceChargeInput} onChange={(event) => setServiceChargeInput(event.target.value)} /></div>}</div>
              </div>
              <div className="field decoder-base"><label htmlFor="tip-base">Tip base</label><select id="tip-base" value={tipBase} onChange={(event) => setTipBase(event.target.value as DinerTipBase)}>{Object.entries(BASE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <p className={`validation-message ${advancedValues.error ? "visible" : ""}`} role="alert">{advancedValues.error ?? " "}</p>

              {advancedValues.result && (
                <div className="decoder-result" aria-live="polite" aria-atomic="true">
                  <div className="decoder-result-heading"><div><p className="eyebrow">Decoded result</p><h3>{money(advancedValues.result.tipCents)} tip</h3></div><span className="base-badge">{BASE_LABELS[tipBase]}</span></div>
                  <dl className="metrics-list">
                    <div><dt>Tip base</dt><dd>{money(advancedValues.result.tipBaseCents)}</dd></div>
                    <div><dt>Effective food %</dt><dd>{percentText(advancedValues.result.effectiveFoodPercent)}</dd></div>
                    <div><dt>Difference vs pre-tax</dt><dd className={advancedValues.result.differenceVsPreTaxCents > 0 ? "positive" : ""}>{advancedValues.result.differenceVsPreTaxCents > 0 ? "+" : ""}{money(advancedValues.result.differenceVsPreTaxCents)}</dd></div>
                    <div><dt>Tax used</dt><dd>{money(advancedValues.result.taxCents)}</dd></div>
                  </dl>
                  {advancedValues.result.serviceChargeWarning && <div className="warning-callout" role="note"><strong>Service charge detected</strong><span>{percentText(advancedValues.result.serviceChargePercent)} of food · combined effective rate {percentText(advancedValues.result.combinedEffectivePercent)}</span></div>}
                </div>
              )}

              <div className="reverse-lookup">
                <div className="section-heading compact"><div><p className="eyebrow">Payment screen check</p><h3>What tip did they suggest?</h3></div></div>
                <p className="section-intro">Enter the tip amount from a payment screen to see what percentage it represents on each common base.</p>
                 <div className="reverse-input-row"><label htmlFor="reverse-tip">Tip amount</label><div className="money-input"><span aria-hidden="true">{currencySymbol()}</span><input id="reverse-tip" inputMode="decimal" value={reverseTipInput} onChange={(event) => setReverseTipInput(event.target.value)} /></div></div>
                {reverseLookup && <div className="lookup-grid" aria-live="polite">{reverseLookup.map((match) => <div className="lookup-item" key={match.base}><span>{BASE_LABELS[match.base]}</span><strong>{percentText(match.percent)}</strong>{match.matchedPreset !== null && <small>matches {match.matchedPreset}%</small>}</div>)}</div>}
                {!reverseLookup && <p className="field-help">Enter valid decoder values above to activate the lookup.</p>}
              </div>
            </div>
          )}
        </section>

        <section className="audience-section" aria-labelledby="audience-title">
          <div>
            <p className="eyebrow accent">Made for both sides of the check</p>
            <h2 id="audience-title">Clear enough to trust.</h2>
            <p>Tipwell helps diners see what a suggested percentage is really based on, and helps tipped workers keep a clean record of every shift.</p>
          </div>
          <div className="audience-links">
            <Link className="audience-card" href="/split"><strong>Split by dish</strong><span>Assign shared appetizers, drinks, and entrées to the people who had them.</span><span className="audience-arrow" aria-hidden="true">→</span></Link>
            <Link className="audience-card" href="/scan"><strong>Scan a receipt</strong><span>Extract likely line items in-browser without uploading the receipt.</span><span className="audience-arrow" aria-hidden="true">→</span></Link>
            <Link className="audience-card" href="/worker"><strong>For tipped workers</strong><span>Track real hourly rate, split pools, and calculate tip-outs.</span><span className="audience-arrow" aria-hidden="true">→</span></Link>
            <Link className="audience-card" href="/auth"><strong>Save your records</strong><span>Create an account when you want shift history and CSV export.</span><span className="audience-arrow" aria-hidden="true">→</span></Link>
            <Link className="audience-card" href="/scan"><strong>Scan a receipt</strong><span>Extract likely line items in-browser without uploading the receipt.</span><span className="audience-arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>

        <footer className="app-footer"><span>Tipwell · private by design</span><span>Record-keeping only. Not tax advice.</span></footer>
      </div>
    </main>
  );
}
