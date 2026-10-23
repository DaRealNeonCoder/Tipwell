import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";

export class StripeConfigurationError extends Error {
  constructor() {
    super("Stripe billing is not configured.");
    this.name = "StripeConfigurationError";
  }
}

let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  const { STRIPE_SECRET_KEY } = getServerEnv();
  if (!STRIPE_SECRET_KEY) throw new StripeConfigurationError();
  stripeClient ??= new Stripe(STRIPE_SECRET_KEY);
  return stripeClient;
}

export function getStripePriceId(): string {
  const { STRIPE_PRO_PRICE_ID } = getServerEnv();
  if (!STRIPE_PRO_PRICE_ID) throw new StripeConfigurationError();
  return STRIPE_PRO_PRICE_ID;
}

export function getStripeWebhookSecret(): string {
  const { STRIPE_WEBHOOK_SECRET } = getServerEnv();
  if (!STRIPE_WEBHOOK_SECRET) throw new StripeConfigurationError();
  return STRIPE_WEBHOOK_SECRET;
}
