"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import AppHeader from "@/components/app-header";
import { canUseFeature } from "@/lib/entitlements";
import { calculateShiftTotals, type ShiftLike } from "@/lib/shift-data";

type Workplace = { id: string; name: string; defaultWageCents: number | null };
type Shift = ShiftLike & {
  id: string;
  workplaceId: string | null;
  workplaceName: string | null;
  createdAt: string;
  updatedAt: string;
};
type ShiftForm = {
  id?: string;
  date: string;
  workplaceId: string;
  hours: string;
  baseWage: string;
  sales: string;
  cashTips: string;
  cardTips: string;
  tipOut: string;
  serviceChargeShare: string;
  notes: string;
};
type WorkplaceForm = { id?: string; name: string; defaultWage: string };

const today = () => new Date().toISOString().slice(0, 10);
const emptyShift = (): ShiftForm => ({ date: today(), workplaceId: "", hours: "8", baseWage: "15.00", sales: "", cashTips: "0.00", cardTips: "0.00", tipOut: "0.00", serviceChargeShare: "0.00", notes: "" });
const emptyWorkplace: WorkplaceForm = { name: "", defaultWage: "" };

function money(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat(currency === "CAD" ? "en-CA" : "en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format((cents ?? 0) / 100);
}

function hours(x100: number) { return (x100 / 100).toFixed(2); }
function dateLabel(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function weekStart(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date.toISOString().slice(0, 10);
}
function monthKey(value: string) { return value.slice(0, 7); }
function monthLabel(value: string) { return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`)); }
function formatTotals(total: ReturnType<typeof calculateShiftTotals>, currency: string) {
  return `${money(total.totalCompensationCents, currency)} total · ${hours(total.hoursX100)} hours`;
}
function centsToInput(cents: number | null) { return cents === null ? "" : (cents / 100).toFixed(2); }
function shiftToForm(shift: Shift): ShiftForm {
  return { id: shift.id, date: shift.date, workplaceId: shift.workplaceId ?? "", hours: hours(shift.hoursX100), baseWage: centsToInput(shift.baseWageCents), sales: centsToInput(shift.salesCents), cashTips: centsToInput(shift.cashTipsCents), cardTips: centsToInput(shift.cardTipsCents), tipOut: centsToInput(shift.tipOutCents), serviceChargeShare: centsToInput(shift.serviceChargeShareCents), notes: shift.notes ?? "" };
}

async function responseError(response: Response) {
  try { const body = await response.json() as { error?: string }; return body.error ?? "Something went wrong."; } catch { return "Something went wrong."; }
}

export default function LogPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShift);
  const [workplaceForm, setWorkplaceForm] = useState<WorkplaceForm>(emptyWorkplace);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [shiftResponse, workplaceResponse] = await Promise.all([fetch("/api/shifts"), fetch("/api/workplaces")]);
      if (!shiftResponse.ok) throw new Error(await responseError(shiftResponse));
      if (!workplaceResponse.ok) throw new Error(await responseError(workplaceResponse));
      setShifts(await shiftResponse.json() as Shift[]);
      setWorkplaces(await workplaceResponse.json() as Workplace[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your shift log.");
    } finally { setLoading(false); }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (session) void loadData();
  }, [session]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function updateShift(field: keyof ShiftForm, value: string) { setShiftForm((current) => ({ ...current, [field]: value })); }

  async function saveShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const response = await fetch(shiftForm.id ? `/api/shifts/${shiftForm.id}` : "/api/shifts", { method: shiftForm.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(shiftForm) });
    if (!response.ok) setError(await responseError(response));
    else { setShiftForm(emptyShift()); setNotice(shiftForm.id ? "Shift updated." : "Shift added."); await loadData(); }
    setSaving(false);
  }

  async function removeShift(id: string) {
    if (!window.confirm("Delete this shift?")) return;
    const response = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (!response.ok) setError(await responseError(response));
    else { setNotice("Shift deleted."); await loadData(); }
  }

  async function saveWorkplace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const response = await fetch(workplaceForm.id ? `/api/workplaces/${workplaceForm.id}` : "/api/workplaces", { method: workplaceForm.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workplaceForm) });
    if (!response.ok) setError(await responseError(response));
    else { setWorkplaceForm(emptyWorkplace); setNotice(workplaceForm.id ? "Workplace updated." : "Workplace added."); await loadData(); }
    setSaving(false);
  }

  async function removeWorkplace(id: string) {
    if (!window.confirm("Delete this workplace? Existing shifts will keep their records without a workplace.")) return;
    const response = await fetch(`/api/workplaces/${id}`, { method: "DELETE" });
    if (!response.ok) setError(await responseError(response));
    else { setNotice("Workplace deleted."); await loadData(); }
  }

  async function exportCsv() {
    setError("");
    const params = new URLSearchParams(); if (exportFrom) params.set("from", exportFrom); if (exportTo) params.set("to", exportTo);
    const response = await fetch(`/api/shifts/export?${params}`);
    if (!response.ok) { setError(await responseError(response)); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tipwell-shifts.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => calculateShiftTotals(shifts), [shifts]);
  const ytdShifts = useMemo(() => { const year = String(new Date().getFullYear()); return shifts.filter((shift) => shift.date.startsWith(year)); }, [shifts]);
  const ytd = useMemo(() => calculateShiftTotals(ytdShifts), [ytdShifts]);
  const weekly = useMemo(() => {
    const groups = new Map<string, Shift[]>();
    for (const shift of shifts) groups.set(weekStart(shift.date), [...(groups.get(weekStart(shift.date)) ?? []), shift]);
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [shifts]);
  const monthly = useMemo(() => {
    const groups = new Map<string, Shift[]>();
    for (const shift of shifts) groups.set(monthKey(shift.date), [...(groups.get(monthKey(shift.date)) ?? []), shift]);
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [shifts]);

  if (sessionPending) return <main className="app-shell"><div className="app-container"><p className="loading-state">Checking your session…</p></div></main>;
   if (!session) return <main className="app-shell"><div className="app-container narrow-container"><AppHeader /><section className="empty-state"><p className="eyebrow accent">Shift log</p><h1>Sign in to see your shifts.</h1><p>Your shift records belong to your account and are never shared between users.</p><Link className="primary-button inline-button" href="/auth">Sign in or create an account</Link></section></div></main>;

  return (
    <main className="app-shell">
       <div className="app-container log-container">
         <AppHeader />
        <section className="hero-copy compact-hero" aria-labelledby="log-title"><p className="eyebrow accent">Worker records</p><h1 id="log-title">Make every shift<br /><em>add up.</em></h1><p>Keep a clear record of your hours, tips, wages, and employer-paid service charges.</p></section>
        {error && <p className="page-alert" role="alert">{error}</p>}{notice && <p className="page-notice" role="status">{notice}</p>}
        <section className="calculator-card" aria-labelledby="shift-form-title"><div className="section-heading"><div><p className="eyebrow">{shiftForm.id ? "Edit record" : "New record"}</p><h2 id="shift-form-title">Log a shift</h2></div><span className="privacy-pill">Account saved</span></div>
          <form className="shift-form" onSubmit={saveShift}>
            <div className="field"><label htmlFor="shift-date">Date</label><input id="shift-date" type="date" value={shiftForm.date} onChange={(event) => updateShift("date", event.target.value)} required /></div>
            <div className="field"><label htmlFor="shift-workplace">Workplace <span className="optional">optional</span></label><select id="shift-workplace" value={shiftForm.workplaceId} onChange={(event) => updateShift("workplaceId", event.target.value)}><option value="">No workplace</option>{workplaces.map((workplace) => <option key={workplace.id} value={workplace.id}>{workplace.name}</option>)}</select></div>
            <div className="field"><label htmlFor="shift-hours">Hours</label><input id="shift-hours" inputMode="decimal" placeholder="8.00" value={shiftForm.hours} onChange={(event) => updateShift("hours", event.target.value)} required /></div>
            <div className="field"><label htmlFor="shift-wage">Base wage / hour</label><div className="money-input"><span aria-hidden="true">$</span><input id="shift-wage" inputMode="decimal" placeholder="15.00" value={shiftForm.baseWage} onChange={(event) => updateShift("baseWage", event.target.value)} required /></div></div>
            <div className="field"><label htmlFor="shift-sales">Sales <span className="optional">optional</span></label><div className="money-input"><span aria-hidden="true">$</span><input id="shift-sales" inputMode="decimal" placeholder="0.00" value={shiftForm.sales} onChange={(event) => updateShift("sales", event.target.value)} /></div></div>
            <div className="field"><label htmlFor="shift-cash">Cash tips</label><div className="money-input"><span aria-hidden="true">$</span><input id="shift-cash" inputMode="decimal" value={shiftForm.cashTips} onChange={(event) => updateShift("cashTips", event.target.value)} /></div></div>
            <div className="field"><label htmlFor="shift-card">Card tips</label><div className="money-input"><span aria-hidden="true">$</span><input id="shift-card" inputMode="decimal" value={shiftForm.cardTips} onChange={(event) => updateShift("cardTips", event.target.value)} /></div></div>
            <div className="field"><label htmlFor="shift-tipout">Tip-out</label><div className="money-input"><span aria-hidden="true">$</span><input id="shift-tipout" inputMode="decimal" value={shiftForm.tipOut} onChange={(event) => updateShift("tipOut", event.target.value)} /></div></div>
            <div className="field field-wide"><label htmlFor="shift-service">Service charge / auto-gratuity share <span className="optional">paid by employer</span></label><div className="money-input"><span aria-hidden="true">$</span><input id="shift-service" inputMode="decimal" value={shiftForm.serviceChargeShare} onChange={(event) => updateShift("serviceChargeShare", event.target.value)} /></div><p className="field-help">Kept separate from cash and card tips.</p></div>
            <div className="field field-wide"><label htmlFor="shift-notes">Notes <span className="optional">optional</span></label><textarea id="shift-notes" rows={3} value={shiftForm.notes} onChange={(event) => updateShift("notes", event.target.value)} /></div>
            <div className="form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : shiftForm.id ? "Update shift" : "Add shift"}</button>{shiftForm.id && <button className="secondary-button" type="button" onClick={() => setShiftForm(emptyShift())}>Cancel edit</button>}</div>
          </form>
        </section>

        <section className="calculator-card workplace-card" aria-labelledby="workplace-title"><div className="section-heading"><div><p className="eyebrow">Optional details</p><h2 id="workplace-title">Workplaces</h2></div><span className="privacy-pill">{workplaces.length} saved</span></div><p className="section-intro">Save more than one workplace and reuse names and wage defaults.</p><form className="inline-form" onSubmit={saveWorkplace}><div className="field"><label htmlFor="workplace-name">Name</label><input id="workplace-name" value={workplaceForm.name} onChange={(event) => setWorkplaceForm({ ...workplaceForm, name: event.target.value })} placeholder="Cafe or restaurant" required /></div><div className="field"><label htmlFor="workplace-wage">Default wage <span className="optional">optional</span></label><div className="money-input"><span aria-hidden="true">$</span><input id="workplace-wage" inputMode="decimal" value={workplaceForm.defaultWage} onChange={(event) => setWorkplaceForm({ ...workplaceForm, defaultWage: event.target.value })} placeholder="15.00" /></div></div><button className="secondary-button" type="submit" disabled={saving}>{workplaceForm.id ? "Update" : "Add workplace"}</button>{workplaceForm.id && <button className="text-button" type="button" onClick={() => setWorkplaceForm(emptyWorkplace)}>Cancel</button>}</form>{workplaces.length > 0 && <ul className="workplace-list">{workplaces.map((workplace) => <li key={workplace.id}><span><strong>{workplace.name}</strong>{workplace.defaultWageCents !== null && <small>{money(workplace.defaultWageCents)} / hour default</small>}</span><span className="row-actions"><button className="text-button" type="button" onClick={() => setWorkplaceForm({ id: workplace.id, name: workplace.name, defaultWage: centsToInput(workplace.defaultWageCents) })}>Edit</button><button className="text-button danger-text" type="button" onClick={() => void removeWorkplace(workplace.id)}>Delete</button></span></li>)}</ul>}</section>

        <section className="summary-grid" aria-label="Shift summaries"><div className="summary-card summary-primary"><p className="eyebrow">All logged shifts</p><strong>{formatTotals(totals, "USD")}</strong><span>Average real hourly rate {totals.averageRealHourlyRateCents === null ? "—" : money(totals.averageRealHourlyRateCents)}</span></div><div className="summary-card"><p className="eyebrow">Year to date</p><strong>{formatTotals(ytd, "USD")}</strong><span>{ytdShifts.length} shifts · {money(ytd.cashTipsCents)} cash · {money(ytd.cardTipsCents)} card</span></div></section>
        <section className="calculator-card totals-card" aria-labelledby="ytd-title"><div className="section-heading"><div><p className="eyebrow">Current year</p><h2 id="ytd-title">YTD summary</h2></div><span className="privacy-pill">Separate records</span></div><dl className="metrics-list totals-list"><div><dt>Cash tips</dt><dd>{money(ytd.cashTipsCents)}</dd></div><div><dt>Card tips</dt><dd>{money(ytd.cardTipsCents)}</dd></div><div><dt>Tip-out</dt><dd>{money(ytd.tipOutCents)}</dd></div><div><dt>Service charge share · paid by employer</dt><dd>{money(ytd.serviceChargeShareCents)}</dd></div><div><dt>Total hours</dt><dd>{hours(ytd.hoursX100)}</dd></div><div><dt>Average real hourly rate</dt><dd>{ytd.averageRealHourlyRateCents === null ? "—" : money(ytd.averageRealHourlyRateCents)}</dd></div></dl></section>
        <section className="calculator-card" aria-labelledby="export-title"><div className="section-heading"><div><p className="eyebrow">Your records</p><h2 id="export-title">Export CSV</h2></div></div><p className="section-intro">Choose a date range. Service charge share is exported in its own column.</p><div className="export-form"><div className="field"><label htmlFor="export-from">From</label><input id="export-from" type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} /></div><div className="field"><label htmlFor="export-to">To</label><input id="export-to" type="date" value={exportTo} onChange={(event) => setExportTo(event.target.value)} /></div><button className="secondary-button" type="button" onClick={() => void exportCsv()} disabled={!canUseFeature("export")}>Download CSV</button></div></section>

        <section aria-labelledby="weekly-title"><div className="section-heading list-heading"><div><p className="eyebrow">Every week</p><h2 id="weekly-title">Weekly totals</h2></div></div>{loading ? <p className="loading-state">Loading shifts…</p> : weekly.length === 0 ? <p className="empty-inline">No shifts yet. Add your first record above.</p> : <div className="period-list">{weekly.map(([start, group]) => <article className="period-card" key={start}><div><strong>Week of {dateLabel(start)}</strong><span>{group.length} shift{group.length === 1 ? "" : "s"}</span></div><b>{formatTotals(calculateShiftTotals(group), "USD")}</b></article>)}</div>}</section>
        <section aria-labelledby="monthly-title"><div className="section-heading list-heading"><div><p className="eyebrow">Across the year</p><h2 id="monthly-title">Monthly totals</h2></div></div>{monthly.length === 0 ? <p className="empty-inline">Monthly totals will appear after your first shift.</p> : <div className="period-list">{monthly.map(([month, group]) => <article className="period-card" key={month}><div><strong>{monthLabel(month)}</strong><span>{group.length} shift{group.length === 1 ? "" : "s"}</span></div><b>{formatTotals(calculateShiftTotals(group), "USD")}</b></article>)}</div>}</section>
        <section aria-labelledby="records-title"><div className="section-heading list-heading"><div><p className="eyebrow">Record book</p><h2 id="records-title">Logged shifts</h2></div></div>{loading ? <p className="loading-state">Loading shifts…</p> : shifts.length === 0 ? <p className="empty-inline">No records to show.</p> : <div className="shift-list">{shifts.map((shift) => <article className="shift-row" key={shift.id}><div className="shift-row-main"><strong>{dateLabel(shift.date)}</strong><span>{shift.workplaceName ?? "No workplace"} · {hours(shift.hoursX100)} hours</span><small>{money(shift.cashTipsCents)} cash + {money(shift.cardTipsCents)} card · {money(shift.serviceChargeShareCents)} service charge</small></div><div className="shift-row-total"><b>{money(calculateShiftTotals([shift]).totalCompensationCents)}</b><span><button className="text-button" type="button" onClick={() => setShiftForm(shiftToForm(shift))}>Edit</button><button className="text-button danger-text" type="button" onClick={() => void removeShift(shift.id)}>Delete</button></span></div></article>)}</div>}</section>
        <p className="record-disclaimer">Record-keeping note: Tipwell helps you organize your own records. Confirm wage, tip, service-charge, tax, and filing treatment with your employer and a qualified tax professional.</p>
        <footer className="app-footer"><span>Tipwell · private by design</span><Link href="/worker">Worker calculators</Link></footer>
      </div>
    </main>
  );
}
