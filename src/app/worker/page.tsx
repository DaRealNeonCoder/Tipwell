"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  calculateTipOutCents,
  calculateWorkerCompensation,
  formatCents,
  parseMoneyToCents,
  roundHalfUp,
  splitTipPoolLargestRemainder,
  sumCents,
} from "@/lib/calc";
import ServiceWorkerRegistration from "../service-worker-registration";
import AuthNav from "@/components/auth-nav";

type PoolPerson = {
  id: number;
  name: string;
  hours: string;
};

type TipOutBase = "sales" | "tips";

const money = (cents: number) => formatCents(cents, "USD", "en-US");
const rate = (centsPerHour: number) => formatCents(roundHalfUp(centsPerHour), "USD", "en-US");

function parseNonNegativeMoney(value: string): number | null {
  const cents = parseMoneyToCents(value);
  return cents !== null && cents >= 0 ? cents : null;
}

function parseOptionalMoney(value: string): number | null {
  return value.trim() === "" ? 0 : parseNonNegativeMoney(value);
}

function parsePositiveHours(value: string): number | null {
  if (value.trim() === "") return null;
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

function parsePercent(value: string): number | null {
  if (value.trim() === "") return null;
  const percentage = Number(value);
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100 ? percentage : null;
}

export default function WorkerPage() {
  const [hoursInput, setHoursInput] = useState("8");
  const [baseWageInput, setBaseWageInput] = useState("15.00");
  const [cashTipsInput, setCashTipsInput] = useState("80.00");
  const [cardTipsInput, setCardTipsInput] = useState("120.00");
  const [workerTipOutInput, setWorkerTipOutInput] = useState("0.00");

  const [poolTipsInput, setPoolTipsInput] = useState("300.00");
  const [poolTipOutInput, setPoolTipOutInput] = useState("0");
  const [nextPersonId, setNextPersonId] = useState(3);
  const [poolPeople, setPoolPeople] = useState<PoolPerson[]>([
    { id: 1, name: "Alex", hours: "8" },
    { id: 2, name: "Sam", hours: "6" },
  ]);

  const [tipOutBase, setTipOutBase] = useState<TipOutBase>("sales");
  const [tipOutAmountInput, setTipOutAmountInput] = useState("1,000.00");
  const [tipOutPercentInput, setTipOutPercentInput] = useState("5");

  const hourlyCalculation = useMemo(() => {
    const hours = parsePositiveHours(hoursInput);
    const baseWageCents = parseNonNegativeMoney(baseWageInput);
    const cashTipsCents = parseOptionalMoney(cashTipsInput);
    const cardTipsCents = parseOptionalMoney(cardTipsInput);
    const tipOutCents = parseOptionalMoney(workerTipOutInput);

    let error: string | null = null;
    if (hours === null) error = "Enter hours greater than zero.";
    else if (baseWageCents === null) error = "Enter a valid, non-negative base wage.";
    else if (cashTipsCents === null || cardTipsCents === null || tipOutCents === null) error = "Use valid, non-negative dollar amounts.";

    if (error || hours === null || baseWageCents === null || cashTipsCents === null || cardTipsCents === null || tipOutCents === null) {
      return { error, result: null };
    }

    const grossTipsCents = sumCents([cashTipsCents, cardTipsCents]);
    const netTipsCents = sumCents([grossTipsCents, -tipOutCents]);
    return {
      error: null,
      result: {
        ...calculateWorkerCompensation({
          hourlyRateCents: baseWageCents,
          hours,
          tipsCents: grossTipsCents,
          tipOutCents,
        }),
        netTipsCents,
        tipsPerHourCents: netTipsCents / hours,
      },
    };
  }, [baseWageInput, cardTipsInput, cashTipsInput, hoursInput, workerTipOutInput]);

  const poolCalculation = useMemo(() => {
    const totalTipsCents = parseNonNegativeMoney(poolTipsInput);
    const tipOutPercent = poolTipOutInput.trim() === "" ? 0 : parsePercent(poolTipOutInput);
    const hours = poolPeople.map((person) => parsePositiveHours(person.hours));

    let error: string | null = null;
    if (totalTipsCents === null) error = "Enter a valid, non-negative total of tips.";
    else if (tipOutPercent === null) error = "Tip-out percentage must be between 0 and 100.";
    else if (poolPeople.length === 0) error = "Add at least one person to the pool.";
    else if (hours.some((value) => value === null)) error = "Each person needs hours greater than zero.";

    if (error || totalTipsCents === null || tipOutPercent === null || hours.some((value) => value === null)) {
      return { error, result: null };
    }

    const tipOutCents = calculateTipOutCents(totalTipsCents, tipOutPercent);
    const poolCents = sumCents([totalTipsCents, -tipOutCents]);
    const shares = splitTipPoolLargestRemainder(poolCents, hours as number[]);
    return {
      error: null,
      result: { totalTipsCents, tipOutCents, poolCents, shares },
    };
  }, [poolPeople, poolTipOutInput, poolTipsInput]);

  const tipOutCalculation = useMemo(() => {
    const amountCents = parseNonNegativeMoney(tipOutAmountInput);
    const percentage = parsePercent(tipOutPercentInput);
    let error: string | null = null;
    if (amountCents === null) error = "Enter a valid, non-negative amount.";
    else if (percentage === null) error = "Tip-out percentage must be between 0 and 100.";

    if (error || amountCents === null || percentage === null) return { error, result: null };
    return { error: null, result: { amountCents, percentage, tipOutCents: calculateTipOutCents(amountCents, percentage) } };
  }, [tipOutAmountInput, tipOutPercentInput]);

  function updatePerson(id: number, field: "name" | "hours", value: string) {
    setPoolPeople((people) => people.map((person) => person.id === id ? { ...person, [field]: value } : person));
  }

  function addPerson() {
    setPoolPeople((people) => [...people, { id: nextPersonId, name: `Person ${people.length + 1}`, hours: "" }]);
    setNextPersonId((id) => id + 1);
  }

  function removePerson(id: number) {
    setPoolPeople((people) => people.filter((person) => person.id !== id));
  }

  return (
    <main className="app-shell">
      <ServiceWorkerRegistration />
      <div className="background-glow" aria-hidden="true" />
      <div className="app-container worker-container">
        <header className="app-header">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">tw</div>
            <div>
              <p className="eyebrow">Tipwell</p>
              <p className="brand-tagline">A better way to settle up.</p>
            </div>
          </div>
          <div className="header-actions"><Link className="worker-link" href="/">Diner tools</Link><Link className="worker-link" href="/log">Shift log</Link><AuthNav /></div>
        </header>

        <section className="hero-copy worker-hero" aria-labelledby="worker-page-title">
          <p className="eyebrow accent">Worker tools</p>
          <h1 id="worker-page-title">Make every shift<br /><em>add up.</em></h1>
          <p>Fast, private calculators for your pay, your pool, and your tip-out.</p>
          <p className="privacy-note">No account. No network required. Your numbers stay on this device.</p>
        </section>

        <div className="worker-stack">
          <section className="calculator-card worker-card" aria-labelledby="hourly-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Your shift</p>
                <h2 id="hourly-title">Tips per hour</h2>
              </div>
              <span className="privacy-pill">Private by design</span>
            </div>
            <p className="section-intro">See your net tips per hour and the real hourly rate after tips and tip-out.</p>

            <div className="worker-field-grid">
              <div className="field">
                <label htmlFor="worker-hours">Hours worked</label>
                <input id="worker-hours" type="number" min="0.01" step="0.25" inputMode="decimal" value={hoursInput} onChange={(event) => setHoursInput(event.target.value)} aria-invalid={Boolean(hourlyCalculation.error && parsePositiveHours(hoursInput) === null)} aria-describedby="hourly-error" />
              </div>
              <div className="field">
                <label htmlFor="base-wage">Base wage / hour</label>
                <div className="money-input"><span aria-hidden="true">$</span><input id="base-wage" inputMode="decimal" value={baseWageInput} onChange={(event) => setBaseWageInput(event.target.value)} aria-invalid={Boolean(hourlyCalculation.error && parseNonNegativeMoney(baseWageInput) === null)} /></div>
              </div>
              <div className="field">
                <label htmlFor="cash-tips">Cash tips</label>
                <div className="money-input"><span aria-hidden="true">$</span><input id="cash-tips" inputMode="decimal" value={cashTipsInput} onChange={(event) => setCashTipsInput(event.target.value)} aria-invalid={Boolean(hourlyCalculation.error && parseOptionalMoney(cashTipsInput) === null)} /></div>
              </div>
              <div className="field">
                <label htmlFor="card-tips">Card tips</label>
                <div className="money-input"><span aria-hidden="true">$</span><input id="card-tips" inputMode="decimal" value={cardTipsInput} onChange={(event) => setCardTipsInput(event.target.value)} aria-invalid={Boolean(hourlyCalculation.error && parseOptionalMoney(cardTipsInput) === null)} /></div>
              </div>
              <div className="field field-wide">
                <label htmlFor="worker-tip-out">Tip-out <span className="optional">optional</span></label>
                <div className="money-input"><span aria-hidden="true">$</span><input id="worker-tip-out" inputMode="decimal" value={workerTipOutInput} onChange={(event) => setWorkerTipOutInput(event.target.value)} aria-invalid={Boolean(hourlyCalculation.error && parseOptionalMoney(workerTipOutInput) === null)} /></div>
                <p className="field-help">A dollar amount taken from your tips.</p>
              </div>
            </div>
            <p id="hourly-error" className={`validation-message ${hourlyCalculation.error ? "visible" : ""}`} role="alert">{hourlyCalculation.error ?? " "}</p>

            {hourlyCalculation.result && (
              <div className="result-panel worker-result" aria-live="polite" aria-atomic="true">
                <div className="result-topline"><span>Real hourly rate</span><span>{hoursInput} hours</span></div>
                <div className="result-amount">{rate(hourlyCalculation.result.realHourlyRateCents)}</div>
                <div className="worker-result-grid">
                  <div><span>Net tips</span><strong>{money(hourlyCalculation.result.netTipsCents)}</strong></div>
                  <div><span>Tips / hour</span><strong>{rate(hourlyCalculation.result.tipsPerHourCents)}</strong></div>
                  <div><span>Wages</span><strong>{money(hourlyCalculation.result.wagesCents)}</strong></div>
                  <div><span>Total take-home</span><strong>{money(hourlyCalculation.result.totalCompensationCents)}</strong></div>
                </div>
              </div>
            )}
          </section>

          <section className="calculator-card worker-card" aria-labelledby="pool-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Share the pool</p>
                <h2 id="pool-title">Pool split by hours</h2>
              </div>
            </div>
            <p className="section-intro">Add each person’s hours. Any leftover cents are assigned exactly by largest remainder.</p>

            <div className="worker-inline-fields">
              <div className="field">
                <label htmlFor="pool-total-tips">Total tips</label>
                <div className="money-input"><span aria-hidden="true">$</span><input id="pool-total-tips" inputMode="decimal" value={poolTipsInput} onChange={(event) => setPoolTipsInput(event.target.value)} aria-invalid={Boolean(poolCalculation.error && parseNonNegativeMoney(poolTipsInput) === null)} aria-describedby="pool-error" /></div>
              </div>
              <div className="field">
                <label htmlFor="pool-tip-out">Tip-out off the top <span className="optional">optional</span></label>
                <div className="percent-input"><input id="pool-tip-out" type="number" min="0" max="100" step="0.1" inputMode="decimal" value={poolTipOutInput} onChange={(event) => setPoolTipOutInput(event.target.value)} aria-invalid={Boolean(poolCalculation.error && poolTipOutInput.trim() !== "" && parsePercent(poolTipOutInput) === null)} /><span aria-hidden="true">%</span></div>
              </div>
            </div>

            <div className="pool-people" aria-label="People in the tip pool">
              {poolPeople.map((person, index) => (
                <div className="pool-person-row" key={person.id}>
                  <div className="field"><label htmlFor={`pool-person-${person.id}`}>Person {index + 1} name</label><input id={`pool-person-${person.id}`} value={person.name} onChange={(event) => updatePerson(person.id, "name", event.target.value)} /></div>
                  <div className="field"><label htmlFor={`pool-hours-${person.id}`}>Hours</label><input id={`pool-hours-${person.id}`} type="number" min="0.01" step="0.25" inputMode="decimal" value={person.hours} onChange={(event) => updatePerson(person.id, "hours", event.target.value)} aria-invalid={Boolean(poolCalculation.error && parsePositiveHours(person.hours) === null)} /></div>
                  <button className="remove-person" type="button" onClick={() => removePerson(person.id)} aria-label={`Remove ${person.name || `person ${index + 1}`} from pool`}>Remove</button>
                </div>
              ))}
            </div>
            <button className="secondary-button" type="button" onClick={addPerson}>+ Add person</button>
            <p id="pool-error" className={`validation-message ${poolCalculation.error ? "visible" : ""}`} role="alert">{poolCalculation.error ?? " "}</p>

            {poolCalculation.result && (
              <div className="pool-result" aria-live="polite" aria-atomic="true">
                <div className="pool-result-summary"><span>Available to split</span><strong>{money(poolCalculation.result.poolCents)}</strong></div>
                {poolCalculation.result.tipOutCents > 0 && <p className="field-help">{money(poolCalculation.result.tipOutCents)} set aside off the top.</p>}
                <div className="pool-share-list">
                  {poolPeople.map((person, index) => <div className="pool-share-row" key={person.id}><span>{person.name || `Person ${index + 1}`} <small>{person.hours} hrs</small></span><strong>{money(poolCalculation.result.shares[index])}</strong></div>)}
                </div>
              </div>
            )}
          </section>

          <section className="calculator-card worker-card" aria-labelledby="tip-out-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Check the percentage</p>
                <h2 id="tip-out-title">Tip-out calculator</h2>
              </div>
            </div>
            <p className="section-intro">Calculate a tip-out from sales or from the tips you collected.</p>
            <div className="segmented-control worker-segmented" aria-label="Tip-out basis">
              <button type="button" className={tipOutBase === "sales" ? "active" : ""} onClick={() => setTipOutBase("sales")} aria-pressed={tipOutBase === "sales"}>Percentage of sales</button>
              <button type="button" className={tipOutBase === "tips" ? "active" : ""} onClick={() => setTipOutBase("tips")} aria-pressed={tipOutBase === "tips"}>Percentage of tips</button>
            </div>
            <div className="worker-inline-fields">
              <div className="field"><label htmlFor="tip-out-amount">{tipOutBase === "sales" ? "Sales" : "Tips"}</label><div className="money-input"><span aria-hidden="true">$</span><input id="tip-out-amount" inputMode="decimal" value={tipOutAmountInput} onChange={(event) => setTipOutAmountInput(event.target.value)} aria-invalid={Boolean(tipOutCalculation.error && parseNonNegativeMoney(tipOutAmountInput) === null)} aria-describedby="tip-out-error" /></div></div>
              <div className="field"><label htmlFor="tip-out-percent">Tip-out percentage</label><div className="percent-input"><input id="tip-out-percent" type="number" min="0" max="100" step="0.1" inputMode="decimal" value={tipOutPercentInput} onChange={(event) => setTipOutPercentInput(event.target.value)} aria-invalid={Boolean(tipOutCalculation.error && parsePercent(tipOutPercentInput) === null)} /><span aria-hidden="true">%</span></div></div>
            </div>
            <p id="tip-out-error" className={`validation-message ${tipOutCalculation.error ? "visible" : ""}`} role="alert">{tipOutCalculation.error ?? " "}</p>
            {tipOutCalculation.result && (
              <div className="result-panel compact-result" aria-live="polite" aria-atomic="true">
                <div className="result-topline"><span>{tipOutCalculation.result.percentage}% of {tipOutBase}</span><span>Tip-out</span></div>
                <div className="result-amount">{money(tipOutCalculation.result.tipOutCents)}</div>
                <p className="rounding-note">Based on {money(tipOutCalculation.result.amountCents)} in {tipOutBase}.</p>
              </div>
            )}
          </section>
        </div>

        <footer className="app-footer"><span>Tipwell · private by design</span><span>Worker tools</span></footer>
      </div>
    </main>
  );
}
