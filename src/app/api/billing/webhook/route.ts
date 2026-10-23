import { NextResponse } from "next/server";
import { processStripeEvent } from "@/lib/billing";
import { getStripe, getStripeWebhookSecret, StripeConfigurationError } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event;
  try {
    // Signature verification must receive the untouched request body.
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch (error) {
    if (error instanceof StripeConfigurationError) return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  try {
    await processStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch {
    // A non-2xx response tells Stripe to retry a failed delivery.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
