"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatCents, parseMoneyToCents } from "@/lib/calc";
import { calculateCashOut, calculateCardTipFeeCents, groupTipStats, type TableTipRecord } from "@/lib/worker-insights";

const money = (cents: number) => formatCents(cents, "USD", "en-US");
const tableStorageKey = "tipwell:table-tips";

function moneyInput(value: string): number | null {
  const parsed = parseMoneyToCents(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function TableTipLogger() {
  const [records, setRecords] = useState<TableTipRecord[]>([]);
  const [section, setSection] = useState("");
  const [daypart, setDaypart] = useState("Dinner");
  const [partySize, setPartySize] = useState("2");
  const [check, setCheck] = useState("");
  const [tip, setTip] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [turnMinutes, setTurnMinutes] = useState("");
  const [error, setError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(tableStorageKey);
      if (stored) setRecords(JSON.parse(stored) as TableTipRecord[]);
    } catch {
      setRecords([]);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persist(next: TableTipRecord[]) {
    setRecords(next);
    window.localStorage.setItem(tableStorageKey, JSON.stringify(next));
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const party = Number(partySize);
    const checkCents = moneyInput(check);
    const tipCents = moneyInput(tip);
    const turn = turnMinutes.trim() === "" ? null : Number(turnMinutes);
    if (!section.trim()) return setError("Add a section or station so your averages can be compared.");
    if (!Number.isInteger(party) || party < 1) return setError("Party size must be a whole number greater than zero.");
    if (checkCents === null || tipCents === null) return setError("Enter valid check and tip amounts.");
    if (turn !== null && (!Number.isInteger(turn) || turn < 0)) return setError("Turn time must be a whole number of minutes.");
    const next: TableTipRecord = { id: `${Date.now()}-${Math.random()}`, date: new Date().toISOString().slice(0, 10), section: section.trim(), daypart: daypart.trim() || "Uncategorized", partySize: party, checkCents, tipCents, menuCategory: menuCategory.trim() || "Uncategorized", turnMinutes: turn };
    persist([next, ...records]);
    setCheck(""); setTip(""); setMenuCategory(""); setTurnMinutes(""); setError("");
  }

  const sectionStats = useMemo(() => groupTipStats(records, "section"), [records]);
  const daypartStats = useMemo(() => groupTipStats(records, "daypart"), [records]);

  return (
    <section className="calculator-card worker-card advanced-worker-card" aria-labelledby="table-log-title">
      <div className="section-heading"><div><p className="eyebrow">Five-second log</p><h2 id="table-log-title">Tables, sections, and turns</h2></div><span className="privacy-pill">Saved on this device</span></div>
      <p className="section-intro">Record a table as soon as it closes. Tipwell turns the log into section, daypart, party-size, and turn-speed patterns.</p>
      <form className="worker-field-grid" onSubmit={addRecord}>
        <div className="field"><label htmlFor="table-section">Section / station</label><input id="table-section" value={section} onChange={(event) => setSection(event.target.value)} placeholder="Section 4" /></div>
        <div className="field"><label htmlFor="table-daypart">Daypart</label><select id="table-daypart" value={daypart} onChange={(event) => setDaypart(event.target.value)}><option>Breakfast</option><option>Lunch</option><option>Brunch</option><option>Dinner</option><option>Late night</option></select></div>
        <div className="field"><label htmlFor="table-party">Party size</label><input id="table-party" type="number" min="1" step="1" value={partySize} onChange={(event) => setPartySize(event.target.value)} /></div>
        <div className="field"><label htmlFor="table-category">Menu category <span className="optional">optional</span></label><input id="table-category" value={menuCategory} onChange={(event) => setMenuCategory(event.target.value)} placeholder="Dinner / prix fixe" /></div>
        <div className="field"><label htmlFor="table-check">Check amount</label><div className="money-input"><span aria-hidden="true">$</span><input id="table-check" inputMode="decimal" value={check} onChange={(event) => setCheck(event.target.value)} placeholder="84.50" /></div></div>
        <div className="field"><label htmlFor="table-tip">Tip</label><div className="money-input"><span aria-hidden="true">$</span><input id="table-tip" inputMode="decimal" value={tip} onChange={(event) => setTip(event.target.value)} placeholder="18.00" /></div></div>
        <div className="field"><label htmlFor="table-turn">Turn time <span className="optional">minutes, optional</span></label><input id="table-turn" type="number" min="0" step="1" value={turnMinutes} onChange={(event) => setTurnMinutes(event.target.value)} placeholder="65" /></div>
        <div className="form-actions"><button className="primary-button" type="submit">Log table</button>{records.length > 0 && <button className="text-button danger-text" type="button" onClick={() => { if (window.confirm("Clear all table logs on this device?")) persist([]); }}>Clear history</button>}</div>
      </form>
      <p className={`validation-message ${error ? "visible" : ""}`} role="alert">{error || " "}</p>
      {records.length > 0 && <div className="insight-grid"><InsightTable title="Section averages" stats={sectionStats} /><InsightTable title="Daypart averages" stats={daypartStats} /></div>}
      {records.length === 0 && <p className="empty-inline">Your first logged table will start the comparison.</p>}
    </section>
  );
}

function InsightTable({ title, stats }: { title: string; stats: ReturnType<typeof groupTipStats> }) {
  return <div className="insight-panel"><div className="section-heading compact"><div><p className="eyebrow">Over time</p><h3>{title}</h3></div><span className="privacy-pill">{stats.length} groups</span></div><div className="insight-list">{stats.map((stat) => <div className="insight-row" key={stat.key}><span><strong>{stat.key}</strong><small>{stat.tables} tables · {stat.covers} covers{stat.averageTurnMinutes === null ? "" : ` · ${stat.averageTurnMinutes} min turns`}</small></span><b>{stat.tipPercent === null ? "—" : `${stat.tipPercent.toFixed(2)}%`}</b></div>)}</div></div>;
}

export function CashOutReconciliation() {
  const [cashSales, setCashSales] = useState("500.00");
  const [cashTips, setCashTips] = useState("120.00");
  const [cardTips, setCardTips] = useState("240.00");
  const [tipOut, setTipOut] = useState("25.00");
  const [feePercent, setFeePercent] = useState("3");
  const [actualCash, setActualCash] = useState("");
  const result = useMemo(() => {
    const values = [cashSales, cashTips, cardTips, tipOut].map(moneyInput);
    const fee = Number(feePercent);
    const actual = actualCash.trim() === "" ? null : moneyInput(actualCash);
    if (values.some((value) => value === null) || !Number.isFinite(fee) || fee < 0 || fee > 100 || (actualCash.trim() !== "" && actual === null)) return null;
    const [cashSalesCents, cashTipsCents, cardTipsCents, tipOutCents] = values as number[];
    return calculateCashOut({ cashSalesCents, cashTipsCents, cardTipsCents, tipOutCents, cardTipFeeCents: calculateCardTipFeeCents(cardTipsCents, fee), actualCashOwedCents: actual });
  }, [actualCash, cardTips, cashSales, cashTips, feePercent, tipOut]);
  return <section className="calculator-card worker-card" aria-labelledby="cashout-title"><div className="section-heading"><div><p className="eyebrow">End of shift</p><h2 id="cashout-title">Cash-out reconciliation</h2></div></div><p className="section-intro">Check expected cash owed, card-tip fees, tip-out, and final take-home before you leave.</p><div className="worker-field-grid"><MoneyField id="cashout-sales" label="Cash sales" value={cashSales} setValue={setCashSales} /><MoneyField id="cashout-cash-tips" label="Cash tips" value={cashTips} setValue={setCashTips} /><MoneyField id="cashout-card-tips" label="Card tips" value={cardTips} setValue={setCardTips} /><MoneyField id="cashout-tipout" label="Tip-out" value={tipOut} setValue={setTipOut} /><div className="field"><label htmlFor="cashout-fee">Card tip fee</label><div className="percent-input"><input id="cashout-fee" type="number" min="0" max="100" step="0.01" value={feePercent} onChange={(event) => setFeePercent(event.target.value)} /><span aria-hidden="true">%</span></div></div><MoneyField id="cashout-actual" label="Actual cash owed" value={actualCash} setValue={setActualCash} optional /></div>{result && <div className="result-panel worker-result" aria-live="polite"><div className="result-topline"><span>Expected cash owed</span><span>{result.varianceCents === null ? "Add actual to verify" : result.varianceCents === 0 ? "Matches" : "Check variance"}</span></div><div className="result-amount">{money(result.expectedCashOwedCents)}</div><div className="worker-result-grid"><div><span>Card fee</span><strong>{money(calculateCardTipFeeCents(moneyInput(cardTips) ?? 0, Number(feePercent)))}</strong></div><div><span>Net tips</span><strong>{money(result.netTipsCents)}</strong></div>{result.varianceCents !== null && <div><span>Cash variance</span><strong>{money(result.varianceCents)}</strong></div>}<div><span>Final take-home tips</span><strong>{money(result.finalTakeHomeCents)}</strong></div></div></div>}</section>;
}

function MoneyField({ id, label, value, setValue, optional = false }: { id: string; label: string; value: string; setValue: (value: string) => void; optional?: boolean }) {
  return <div className="field"><label htmlFor={id}>{label} {optional && <span className="optional">optional</span>}</label><div className="money-input"><span aria-hidden="true">$</span><input id={id} inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} /></div></div>;
}

export default function WorkerAdvancedTools() {
  return <div className="worker-stack"><TableTipLogger /><CashOutReconciliation /></div>;
}
