import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/billing";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { StripeConfigurationError } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const idempotencyKey = request.headers.get("x-idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 255) {
      return NextResponse.json({ error: "A checkout request id is required." }, { status: 400 });
    }
    const url = await createCheckoutSession(userId, idempotencyKey);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (error instanceof StripeConfigurationError) return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
    if (error instanceof Error && error.message.includes("already have a Tipwell subscription")) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
