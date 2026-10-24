"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import AuthNav from "@/components/auth-nav";

type AuthMode = "sign-in" | "sign-up";

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Unable to complete that request. Check your details and try again.";
}

async function mergeLocalPreferences() {
  try {
    const raw = window.localStorage.getItem("tipwell:diner-state");
    if (!raw) return;
    const saved = JSON.parse(raw) as {
      tipPercent?: unknown;
      tipBase?: unknown;
      region?: unknown;
    };
    const baseMap: Record<string, string> = {
      "pre-tax": "pre_tax",
      "pre-tax-plus-fees": "pre_tax_plus_fees",
      "pre-discount": "pre_discount",
      "post-tax": "post_tax",
    };
    const tipPercent = typeof saved.tipPercent === "number" && Number.isFinite(saved.tipPercent)
      ? saved.tipPercent
      : 18;
    const region = saved.region === "ca" ? "CA" : "US";
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localSettings: {
          region,
          currency: region === "CA" ? "CAD" : "USD",
          defaultTipBps: Math.round(tipPercent * 100),
          defaultTipBase: typeof saved.tipBase === "string" ? baseMap[saved.tipBase] ?? "pre_tax" : "pre_tax",
        },
      }),
    });
  } catch {
    // Preferences are a convenience; sign-in should still succeed if storage is unavailable.
  }
}

async function waitForSession() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await authClient.getSession();
    if (result.data) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

export default function AuthPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.push("/log");
  }, [router, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = mode === "sign-in"
      ? await authClient.signIn.email({ email, password, callbackURL: "/log" })
      : await authClient.signUp.email({ name, email, password, callbackURL: "/log" });
    setBusy(false);
    if (result.error) setError(errorMessage(result.error));
    else {
      await mergeLocalPreferences();
      // Confirm the cookie is readable before transitioning to the protected
      // page. This avoids a client navigation racing the session cookie write.
      if (!(await waitForSession())) {
        setError("Your account was created, but the session was not available yet. Please try again.");
      } else {
        router.push("/log");
        router.refresh();
      }
    }
  }

  async function signInWithGoogle() {
    setError("");
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/log" });
    if (result.error) setError(errorMessage(result.error));
  }

  return (
    <main className="app-shell">
      <div className="app-container narrow-container">
        <header className="app-header"><Link className="brand-lockup brand-link" href="/"><span className="brand-mark" aria-hidden="true">tw</span><span><span className="eyebrow">Tipwell</span><span className="brand-tagline">A better way to settle up.</span></span></Link><AuthNav /></header>
        <section className="hero-copy compact-hero" aria-labelledby="auth-title"><p className="eyebrow accent">Your account</p><h1 id="auth-title">Keep your shifts<br /><em>in one place.</em></h1><p>Sign in to log shifts, keep workplace details, and export your records.</p></section>
        <section className="calculator-card auth-card" aria-labelledby="auth-form-title">
          <div className="section-heading"><div><p className="eyebrow">{mode === "sign-in" ? "Welcome back" : "Get started"}</p><h2 id="auth-form-title">{mode === "sign-in" ? "Sign in" : "Create your account"}</h2></div></div>
          <form className="stack-form" onSubmit={submit}>
            {mode === "sign-up" && <div className="field"><label htmlFor="auth-name">Name</label><input id="auth-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div>}
            <div className="field"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="field"><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><p className="field-help">Use at least 8 characters.</p></div>
            <p className={`validation-message ${error ? "visible" : ""}`} role="alert">{error || " "}</p>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <button className="secondary-button full-button" type="button" onClick={() => void signInWithGoogle()}>Continue with Google</button>
          <p className="switch-auth">{mode === "sign-in" ? "New to Tipwell?" : "Already have an account?"} <button className="text-button" type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); }}>{mode === "sign-in" ? "Create an account" : "Sign in"}</button></p>
          {isPending && <p className="field-help" role="status">Checking your session…</p>}
        </section>
        <footer className="app-footer"><span>Tipwell · private by design</span><Link href="/">Diner calculator</Link></footer>
      </div>
    </main>
  );
}
