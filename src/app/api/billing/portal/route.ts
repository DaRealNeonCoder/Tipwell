import { NextResponse } from "next/server";
import { createPortalSession } from "@/lib/billing";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { StripeConfigurationError } from "@/lib/stripe";

export async function POST() {
  try {
    const url = await createPortalSession(await requireUserId());
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (error instanceof StripeConfigurationError) return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
    if (error instanceof Error && error.message.includes("No Stripe customer")) return NextResponse.json({ error: "Start a subscription before opening billing." }, { status: 400 });
    return NextResponse.json({ error: "Unable to open billing." }, { status: 500 });
  }
}
