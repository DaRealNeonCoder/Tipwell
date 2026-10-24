"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function AuthNav() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <Link className="worker-link" href="/auth">Account</Link>;
  if (!session) return <Link className="worker-link" href="/auth">Sign in</Link>;
  return (
    <span className="auth-nav">
      <Link className="worker-link" href="/settings">Settings</Link>
      <button className="text-button" type="button" onClick={() => void authClient.signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })}>Sign out</button>
    </span>
  );
}
