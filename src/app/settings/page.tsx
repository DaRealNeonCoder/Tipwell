"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthNav from "@/components/auth-nav";
import { authClient } from "@/lib/auth-client";

type Settings = {
  region: "US" | "CA";
  currency: string;
  defaultTipBps: number;
  defaultTipBase: "pre_tax" | "pre_tax_plus_fees" | "pre_discount" | "post_tax";
  isWorker: boolean;
  plan: "free" | "pro";
};

const baseLabels: Record<Settings["defaultTipBase"], string> = {
  pre_tax: "Pre-tax",
  pre_tax_plus_fees: "Pre-tax + fees",
  pre_discount: "Pre-discount",
  post_tax: "Post-tax",
};

async function errorMessage(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? "Unable to save settings.";
  } catch {
    return "Unable to save settings.";
  }
}

export default function SettingsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tipPercent, setTipPercent] = useState("18");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    void fetch("/api/settings").then(async (response) => {
      if (!response.ok) throw new Error(await errorMessage(response));
      return response.json() as Promise<Settings>;
    }).then((value) => {
      setSettings(value);
      setTipPercent((value.defaultTipBps / 100).toFixed(2).replace(/\.00$/, ""));
      setCurrency(value.currency);
    }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load settings."));
  }, [session]);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: settings.region,
        currency,
        defaultTipBps: Number(tipPercent) * 100,
        defaultTipBase: settings.defaultTipBase,
        isWorker: settings.isWorker,
      }),
    });
    if (!response.ok) {
      setError(await errorMessage(response));
    } else {
      const saved = await response.json() as Settings;
      setSettings(saved);
      setCurrency(saved.currency);
      setTipPercent((saved.defaultTipBps / 100).toString());
      setNotice("Settings saved.");
    }
    setBusy(false);
  }

  if (sessionPending) return <main className="app-shell"><div className="app-container"><p className="loading-state">Checking your session…</p></div></main>;
  if (!session) return <main className="app-shell"><div className="app-container narrow-container"><header className="app-header"><Link className="brand-lockup brand-link" href="/"><span className="brand-mark" aria-hidden="true">tw</span><span className="eyebrow">Tipwell</span></Link><AuthNav /></header><section className="empty-state"><p className="eyebrow accent">Settings</p><h1>Sign in to manage settings.</h1><p>Your preferences are saved to your account.</p><Link className="primary-button inline-button" href="/auth">Sign in or create an account</Link></section></div></main>;

  return (
    <main className="app-shell">
      <div className="background-glow" aria-hidden="true" />
      <div className="app-container narrow-container">
        <header className="app-header"><Link className="brand-lockup brand-link" href="/"><span className="brand-mark" aria-hidden="true">tw</span><span><span className="eyebrow">Tipwell</span><span className="brand-tagline">A better way to settle up.</span></span></Link><AuthNav /></header>
        <section className="hero-copy compact-hero" aria-labelledby="settings-title"><p className="eyebrow accent">Account preferences</p><h1 id="settings-title">Make Tipwell<br /><em>fit your work.</em></h1><p>These validated settings power your account calculators and worker tools.</p></section>
        {error && <p className="page-alert" role="alert">{error}</p>}
        {notice && <p className="page-notice" role="status">{notice}</p>}
        <section className="calculator-card settings-card" aria-labelledby="prefs-title">
          <div className="section-heading"><div><p className="eyebrow">Calculator defaults</p><h2 id="prefs-title">Preferences</h2></div></div>
          {settings && <div className="settings-form">
            <div className="field"><label htmlFor="settings-region">Region</label><select id="settings-region" value={settings.region} onChange={(event) => setSettings({ ...settings, region: event.target.value as Settings["region"], currency: event.target.value === "CA" ? "CAD" : "USD" })}><option value="US">United States</option><option value="CA">Canada</option></select></div>
            <div className="field"><label htmlFor="settings-currency">Currency</label><input id="settings-currency" maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></div>
            <div className="field"><label htmlFor="settings-tip-percent">Default tip percent</label><div className="percent-input"><input id="settings-tip-percent" type="number" min="0" max="100" step="0.01" value={tipPercent} onChange={(event) => setTipPercent(event.target.value)} /><span aria-hidden="true">%</span></div></div>
            <div className="field"><label htmlFor="settings-tip-base">Default tip base</label><select id="settings-tip-base" value={settings.defaultTipBase} onChange={(event) => setSettings({ ...settings, defaultTipBase: event.target.value as Settings["defaultTipBase"] })}>{Object.entries(baseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <label className="checkbox-label settings-worker-toggle"><input type="checkbox" checked={settings.isWorker} onChange={(event) => setSettings({ ...settings, isWorker: event.target.checked })} /><span>I take tips and want worker tools handy.</span></label>
            <p className="field-help">Plan: {settings.plan === "pro" ? "Pro" : "Free"}. Billing is not part of v1.</p>
            <button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save settings"}</button>
          </div>}
        </section>
        <section className="account-card"><p className="eyebrow">Signed in as</p><strong>{session.user.name || session.user.email}</strong><span>{session.user.email}</span></section>
        <footer className="app-footer"><Link href="/">Diner calculator</Link><Link href="/log">Shift log</Link></footer>
      </div>
    </main>
  );
}
