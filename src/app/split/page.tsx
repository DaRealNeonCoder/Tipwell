"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculateItemizedSplit, formatCents, parseMoneyToCents, type ItemizedItem } from "@/lib/calc";
import AppHeader from "@/components/app-header";
import ServiceWorkerRegistration from "../service-worker-registration";
import { RECEIPT_ITEMS_STORAGE_KEY, type ReceiptLineItem } from "@/lib/receipt-parser";

type DraftItem = { id: number; name: string; price: string; personIds: number[] };
const money = (cents: number) => formatCents(cents, "USD", "en-US");
const initialItems: DraftItem[] = [{ id: 1, name: "Shared appetizer", price: "12.00", personIds: [0, 1] }, { id: 2, name: "Your entrée", price: "18.00", personIds: [0] }];

export default function ItemizedSplitPage() {
  const [people, setPeople] = useState(["You", "Friend 2"]);
  const [items, setItems] = useState<DraftItem[]>(() => {
    if (typeof window === "undefined") return initialItems;
    try {
      const scanned = JSON.parse(window.localStorage.getItem(RECEIPT_ITEMS_STORAGE_KEY) ?? "null") as ReceiptLineItem[] | null;
      return Array.isArray(scanned) && scanned.length > 0 ? scanned.map((item, index) => ({ id: Date.now() + index, name: item.name, price: item.price, personIds: [0] })) : initialItems;
    } catch {
      return initialItems;
    }
  });
  const [tipPercent, setTipPercent] = useState("18");
  const calculation = useMemo(() => {
    const normalized: ItemizedItem[] = items.map((item) => ({ name: item.name, priceCents: parseMoneyToCents(item.price) ?? -1, personIds: item.personIds }));
    try { return { error: null, result: calculateItemizedSplit({ people: people.length, items: normalized, tipPercent: Number(tipPercent) }) }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Check the itemized split.", result: null }; }
  }, [items, people.length, tipPercent]);

  function addPerson() {
    setPeople((current) => [...current, `Person ${current.length + 1}`]);
  }
  function addItem() {
    setItems((current) => [...current, { id: Date.now(), name: "New item", price: "0.00", personIds: [0] }]);
  }
  function updateItem(id: number, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }
  function togglePerson(item: DraftItem, personId: number) {
    const next = item.personIds.includes(personId) ? item.personIds.filter((id) => id !== personId) : [...item.personIds, personId];
    updateItem(item.id, { personIds: next });
  }

  return (
    <main className="app-shell"><ServiceWorkerRegistration /><div className="app-container split-container"><AppHeader />
      <section className="hero-copy compact-hero" aria-labelledby="split-title"><p className="eyebrow accent">Diner tool</p><h1 id="split-title">Split the dishes.<br /><em>Not the guesswork.</em></h1><p>Assign each item to the people who shared it. Shared dishes are divided exactly, down to the cent.</p></section>
      <Link className="back-link" href="/">← Back to diner calculator</Link>
      <section className="calculator-card" aria-labelledby="items-title"><div className="section-heading"><div><p className="eyebrow">Itemized split</p><h2 id="items-title">Who had what?</h2></div><span className="privacy-pill">Runs on this device</span></div>
        <div className="people-editor"><div className="section-heading compact"><div><p className="eyebrow">People</p><h3>Split with</h3></div><button className="secondary-button" type="button" onClick={addPerson}>+ Add person</button></div><div className="people-chips">{people.map((person, index) => <label className="person-chip" key={`${person}-${index}`}><span className="person-number">{index + 1}</span><input aria-label={`Person ${index + 1} name`} value={person} onChange={(event) => setPeople((current) => current.map((name, personIndex) => personIndex === index ? event.target.value : name))} /></label>)}</div><Link className="scan-shortcut" href="/scan">Have a receipt photo? Scan it on this device →</Link></div>
        <div className="item-list">{items.map((item, index) => <article className="item-editor" key={item.id}><div className="item-editor-top"><div className="field"><label htmlFor={`item-name-${item.id}`}>Item {index + 1}</label><input id={`item-name-${item.id}`} value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /></div><div className="field item-price"><label htmlFor={`item-price-${item.id}`}>Price</label><div className="money-input"><span aria-hidden="true">$</span><input id={`item-price-${item.id}`} inputMode="decimal" value={item.price} onChange={(event) => updateItem(item.id, { price: event.target.value })} /></div></div>{items.length > 1 && <button className="text-button danger-text" type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>Remove</button>}</div><fieldset className="item-assignees"><legend>Shared by</legend><div className="assignee-grid">{people.map((person, personId) => <label className={`assignee ${item.personIds.includes(personId) ? "selected" : ""}`} key={`${item.id}-${personId}`}><input type="checkbox" checked={item.personIds.includes(personId)} onChange={() => togglePerson(item, personId)} /><span>{person || `Person ${personId + 1}`}</span></label>)}</div></fieldset></article>)}</div>
        <button className="secondary-button" type="button" onClick={addItem}>+ Add dish or drink</button>
        <div className="split-tip-control field"><label htmlFor="itemized-tip">Tip percentage</label><div className="percent-input"><input id="itemized-tip" type="number" min="0" max="100" step="0.5" value={tipPercent} onChange={(event) => setTipPercent(event.target.value)} /><span aria-hidden="true">%</span></div></div>
        <p className={`validation-message ${calculation.error ? "visible" : ""}`} role="alert">{calculation.error ?? " "}</p>
        {calculation.result && <div className="itemized-result" aria-live="polite"><div className="result-topline"><span>Receipt total</span><strong>{money(calculation.result.totalCents)}</strong></div><p className="field-help">{money(calculation.result.subtotalCents)} subtotal · {money(calculation.result.tipCents)} tip</p>{people.map((person, index) => <div className="itemized-share" key={`${person}-${index}`}><span>{person || `Person ${index + 1}`}</span><strong>{money(calculation.result?.perPersonTotalCents[index] ?? 0)}</strong><small>{money(calculation.result?.perPersonSubtotalCents[index] ?? 0)} food · {money(calculation.result?.perPersonTipCents[index] ?? 0)} tip</small></div>)}</div>}
      </section>
      <footer className="app-footer"><Link href="/">Diner calculator</Link><Link href="/decoder">Receipt decoder</Link></footer>
    </div></main>
  );
}
