"use client";

import { useMemo, useState } from "react";
import { formatCents, parseMoneyToCents, splitTipPoolLargestRemainder } from "@/lib/calc";

type Person = { id: number; name: string; hours: string; weight: string };
const money = (cents: number) => formatCents(cents, "USD", "en-US");

export default function ManagerTools() {
  const [totalTips, setTotalTips] = useState("800.00");
  const [supportPercent, setSupportPercent] = useState("4");
  const [people, setPeople] = useState<Person[]>([{ id: 1, name: "Maria", hours: "8", weight: "1" }, { id: 2, name: "Dev", hours: "6", weight: "1" }, { id: 3, name: "Sam", hours: "5", weight: "0.75" }]);
  const [nextId, setNextId] = useState(4);
  const totalCents = parseMoneyToCents(totalTips);
  const support = Number(supportPercent);
  const result = useMemo(() => {
    if (totalCents === null || totalCents < 0 || !Number.isFinite(support) || support < 0 || support > 100 || people.length === 0) return null;
    const weights = people.map((person) => Number(person.hours) * Number(person.weight));
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0) || weights.every((weight) => weight === 0)) return null;
    const supportCents = Math.round(totalCents * support / 100);
    return { supportCents, poolCents: totalCents - supportCents, shares: splitTipPoolLargestRemainder(totalCents - supportCents, weights) };
  }, [people, support, totalCents]);
  function update(id: number, field: keyof Person, value: string) { setPeople((current) => current.map((person) => person.id === id ? { ...person, [field]: value } : person)); }
  return <section className="calculator-card manager-card" aria-labelledby="policy-title"><div className="section-heading"><div><p className="eyebrow">Owner / manager tool</p><h2 id="policy-title">Tip pool policy builder</h2></div><span className="privacy-pill">Preview only</span></div><p className="section-intro">Set a plain-language rule, then preview exact-cent payouts by hours and role weight. This is a calculator, not legal advice.</p><div className="worker-inline-fields"><MoneyField id="policy-tips" label="Tips to distribute" value={totalTips} setValue={setTotalTips} /><div className="field"><label htmlFor="policy-support">Support-staff tip-out</label><div className="percent-input"><input id="policy-support" type="number" min="0" max="100" step="0.1" value={supportPercent} onChange={(event) => setSupportPercent(event.target.value)} /><span aria-hidden="true">%</span></div></div></div><div className="policy-people">{people.map((person, index) => <div className="policy-person" key={person.id}><div className="field"><label htmlFor={`policy-name-${person.id}`}>Employee {index + 1}</label><input id={`policy-name-${person.id}`} value={person.name} onChange={(event) => update(person.id, "name", event.target.value)} /></div><div className="field"><label htmlFor={`policy-hours-${person.id}`}>Hours</label><input id={`policy-hours-${person.id}`} type="number" min="0" step="0.25" value={person.hours} onChange={(event) => update(person.id, "hours", event.target.value)} /></div><div className="field"><label htmlFor={`policy-weight-${person.id}`}>Role weight</label><input id={`policy-weight-${person.id}`} type="number" min="0" step="0.05" value={person.weight} onChange={(event) => update(person.id, "weight", event.target.value)} /></div><button className="text-button danger-text" type="button" onClick={() => setPeople((current) => current.filter((item) => item.id !== person.id))}>Remove</button></div>)}</div><button className="secondary-button" type="button" onClick={() => { setPeople((current) => [...current, { id: nextId, name: `Employee ${current.length + 1}`, hours: "", weight: "1" }]); setNextId((id) => id + 1); }}>+ Add employee</button>{result && <div className="policy-result"><p className="eyebrow">Staff-facing preview</p><p className="policy-copy">Today’s tip pool is distributed by hours × role weight. {supportPercent}% ({money(result.supportCents)}) is set aside for support staff, and the remaining {money(result.poolCents)} is allocated with leftover cents distributed deterministically.</p><div className="pool-share-list">{people.map((person, index) => <div className="pool-share-row" key={person.id}><span>{person.name || `Employee ${index + 1}`} <small>{person.hours} hrs × {person.weight}</small></span><strong>{money(result.shares[index] ?? 0)}</strong></div>)}</div></div>}<p className="record-disclaimer manager-disclaimer">Compliance varies by state and province. Review local rules before using a policy, and do not include managers or owners in a tip pool where prohibited.</p></section>;
}

function MoneyField({ id, label, value, setValue }: { id: string; label: string; value: string; setValue: (value: string) => void }) {
  return <div className="field"><label htmlFor={id}>{label}</label><div className="money-input"><span aria-hidden="true">$</span><input id={id} inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} /></div></div>;
}
