"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/app-header";
import { authClient } from "@/lib/auth-client";

type Settings = {
  region: "US" | "CA";
  currency: string;
  defaultTipBps: number;
  defaultTipBase: "pre_tax" | "pre_tax_plus_fees" | "pre_discount" | "post_tax";
  isWorker: boolean;
  plan: "free" | "pro";
};

type BillingStatus = {
  plan: "free" | "pro";
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  hasCustomer: boolean;
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
  const [billing, setBilling] = useState<BillingStatus | null>(null);

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

  useEffect(() => {
    if (!session) return;
    void fetch("/api/billing/status").then(async (response) => {
      if (!response.ok) throw new Error("Unable to load billing status.");
      return response.json() as Promise<BillingStatus>;
    }).then(setBilling).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load billing status."));
  }, [session]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("billing");
    const message = result === "success"
      ? "Checkout finished. Stripe is confirming your subscription; access changes when the webhook arrives."
      : result === "cancelled" ? "Checkout was cancelled. No subscription changes were made." : "";
    if (!message) return;
    const timer = window.setTimeout(() => setNotice(message), 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  async function startCheckout() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "x-idempotency-key": crypto.randomUUID() },
    });
    if (!response.ok) {
      setError(await errorMessage(response));
      setBusy(false);
      return;
    }
    const result = await response.json() as { url: string };
    window.location.assign(result.url);
  }

  async function openPortal() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/billing/portal", { method: "POST" });
    if (!response.ok) {
      setError(await errorMessage(response));
      setBusy(false);
      return;
    }
    const result = await response.json() as { url: string };
    window.location.assign(result.url);
  }

  if (sessionPending) return <main className="app-shell"><div className="app-container"><p className="loading-state">Checking your session…</p></div></main>;
   if (!session) return <main className="app-shell"><div className="app-container narrow-container"><AppHeader /><section className="empty-state"><p className="eyebrow accent">Settings</p><h1>Sign in to manage settings.</h1><p>Your preferences are saved to your account.</p><Link className="primary-button inline-button" href="/auth">Sign in or create an account</Link></section></div></main>;

  return (
    <main className="app-shell">
       <div className="app-container narrow-container">
         <AppHeader />
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
            <p className="field-help">Plan: {(billing ? billing.plan : settings.plan) === "pro" ? "Pro" : "Free"}.</p>
            <button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save settings"}</button>
          </div>}
        </section>
        <section className="account-card billing-card" aria-labelledby="billing-title">
          <div className="section-heading"><div><p className="eyebrow">Subscription</p><h2 id="billing-title">Tipwell Pro</h2></div><span className="base-badge">{billing?.plan === "pro" ? "Active" : billing?.status ? "Needs attention" : "Free"}</span></div>
          {billing?.plan === "pro" || billing?.hasCustomer ? <>
            <p className="section-intro">{billing?.plan === "pro" ? "Your Pro access is controlled by Stripe webhooks, not the checkout redirect." : "Your Stripe subscription needs attention. Open billing to update your payment method or subscription."}</p>
            {billing.cancelAtPeriodEnd && <p className="field-help">Your subscription is set to cancel at the end of the current period.</p>}
            {billing.currentPeriodEnd && <p className="field-help">Current period ends {new Date(billing.currentPeriodEnd).toLocaleDateString()}.</p>}
            <button className="secondary-button" type="button" disabled={busy} onClick={() => void openPortal()}>Manage billing</button>
          </> : <>
            <p className="section-intro">Unlock Pro with a secure Stripe subscription. We activate access only after Stripe confirms payment.</p>
            <button className="primary-button" type="button" disabled={busy} onClick={() => void startCheckout()}>{busy ? "Opening checkout…" : "Subscribe with Stripe"}</button>
          </>}
        </section>
        <section className="account-card"><p className="eyebrow">Signed in as</p><strong>{session.user.name || session.user.email}</strong><span>{session.user.email}</span></section>
        <footer className="app-footer"><Link href="/">Diner calculator</Link><Link href="/log">Shift log</Link></footer>
      </div>
    </main>
  );
}
