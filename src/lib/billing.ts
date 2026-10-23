import { and, eq, isNull, or, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/db";
import { subscriptions, userSettings, webhookEvents } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { getServerEnv } from "@/lib/env";
import { getStripe, getStripePriceId } from "@/lib/stripe";
import { subscriptionGrantsAccess } from "@/lib/billing-policy";

export { subscriptionGrantsAccess } from "@/lib/billing-policy";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);
const TERMINAL_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>(["canceled", "incomplete_expired"]);

export type BillingStatus = {
  plan: "free" | "pro";
  status: Stripe.Subscription.Status | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  hasCustomer: boolean;
};

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const db = getDb();
  const [[account], [subscription]] = await Promise.all([
    db.select({ stripeCustomerId: user.stripeCustomerId }).from(user).where(eq(user.id, userId)).limit(1),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1),
  ]);
  return {
    plan: subscriptionGrantsAccess(subscription?.status) ? "pro" : "free",
    status: (subscription?.status as Stripe.Subscription.Status | undefined) ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    hasCustomer: Boolean(account?.stripeCustomerId),
  };
}

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const db = getDb();
  const [account] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!account) throw new Error("User account not found.");
  if (account.stripeCustomerId) return account.stripeCustomerId;

  // The stable idempotency key prevents concurrent checkout requests from
  // creating two Stripe customers for the same Tipwell user.
  const customer = await getStripe().customers.create(
    {
      email: account.email,
      name: account.name,
      metadata: { tipwellUserId: account.id },
    },
    { idempotencyKey: `customer:${account.id}` },
  );
  const [saved] = await db
    .update(user)
    .set({ stripeCustomerId: customer.id })
    .where(and(eq(user.id, account.id), isNull(user.stripeCustomerId)))
    .returning({ stripeCustomerId: user.stripeCustomerId });
  return saved?.stripeCustomerId ?? customer.id;
}

export async function createCheckoutSession(userId: string, idempotencyKey: string): Promise<string> {
  const priceId = getStripePriceId();
  const billing = await getBillingStatus(userId);
  if (billing.status && !TERMINAL_SUBSCRIPTION_STATUSES.has(billing.status)) {
    throw new Error(ACTIVE_SUBSCRIPTION_STATUSES.has(billing.status)
      ? "You already have an active Tipwell subscription."
      : "You already have a Tipwell subscription that needs attention. Open billing to manage it.");
  }
  const customerId = await getOrCreateStripeCustomer(userId);
  const { BETTER_AUTH_URL } = getServerEnv();
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { tipwellUserId: userId } },
      success_url: `${BETTER_AUTH_URL}/settings?billing=success`,
      cancel_url: `${BETTER_AUTH_URL}/settings?billing=cancelled`,
    },
    { idempotencyKey },
  );
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalSession(userId: string): Promise<string> {
  const db = getDb();
  const [account] = await db.select({ stripeCustomerId: user.stripeCustomerId }).from(user).where(eq(user.id, userId)).limit(1);
  if (!account?.stripeCustomerId) throw new Error("No Stripe customer exists for this account.");
  const { BETTER_AUTH_URL } = getServerEnv();
  const session = await getStripe().billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${BETTER_AUTH_URL}/settings`,
  });
  return session.url;
}

async function userIdForCustomer(customerId: string, metadataUserId?: string): Promise<string | null> {
  const db = getDb();
  if (metadataUserId) {
    const [metadataUser] = await db.select({ id: user.id }).from(user).where(eq(user.id, metadataUserId)).limit(1);
    if (metadataUser) return metadataUser.id;
  }
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.stripeCustomerId, customerId)).limit(1);
  return account?.id ?? null;
}

async function rememberCustomer(userId: string, customerId: string): Promise<void> {
  await getDb().update(user).set({ stripeCustomerId: customerId }).where(and(eq(user.id, userId), isNull(user.stripeCustomerId)));
}

async function applySubscriptionEvent(event: Stripe.Event, subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = await userIdForCustomer(customerId, subscription.metadata?.tipwellUserId);
  if (!userId) throw new Error(`No Tipwell user is mapped to Stripe customer ${customerId}.`);
  await rememberCustomer(userId, customerId);

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) throw new Error(`Stripe subscription ${subscription.id} has no price.`);
  const subscriptionItem = subscription.items.data[0];
  const periodStart = subscriptionItem?.current_period_start;
  const periodEnd = subscriptionItem?.current_period_end;
  const now = new Date();
  await getDb()
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      lastEventCreatedAt: event.created,
      lastEventId: event.id,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status,
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastEventCreatedAt: event.created,
        lastEventId: event.id,
        updatedAt: now,
      },
      // Stripe can deliver subscription events out of order. The newest event
      // wins, even when two events share the same Stripe timestamp.
      where: or(
        sql`${subscriptions.lastEventCreatedAt} < ${event.created}`,
        and(
          eq(subscriptions.lastEventCreatedAt, event.created),
          sql`${subscriptions.lastEventId} < ${event.id}`,
        ),
      ),
    });

  const [current] = await getDb().select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  await getDb()
    .insert(userSettings)
    .values({ userId, plan: subscriptionGrantsAccess(current?.status) ? "pro" : "free", updatedAt: now })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { plan: subscriptionGrantsAccess(current?.status) ? "pro" : "free", updatedAt: now },
    });
}

async function applyCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const userId = session.client_reference_id ?? session.metadata?.tipwellUserId;
  if (!customerId || !userId) return;
  await rememberCustomer(userId, customerId);
}

export async function processStripeEvent(event: Stripe.Event): Promise<"processed" | "duplicate"> {
  const db = getDb();
  const [inserted] = await db
    .insert(webhookEvents)
    .values({ stripeEventId: event.id, type: event.type, eventCreatedAt: event.created })
    .onConflictDoNothing({ target: webhookEvents.stripeEventId })
    .returning({ stripeEventId: webhookEvents.stripeEventId });

  if (!inserted) {
    const [existing] = await db.select({ status: webhookEvents.status }).from(webhookEvents).where(eq(webhookEvents.stripeEventId, event.id)).limit(1);
    if (existing?.status === "processed") return "duplicate";
    await db
      .update(webhookEvents)
      .set({ status: "pending", attempts: sql`${webhookEvents.attempts} + 1`, lastError: null })
      .where(eq(webhookEvents.stripeEventId, event.id));
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await applyCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await applySubscriptionEvent(event, event.data.object as Stripe.Subscription);
    }
    await db.update(webhookEvents).set({ status: "processed", processedAt: new Date(), lastError: null }).where(eq(webhookEvents.stripeEventId, event.id));
    return "processed";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook processing error.";
    await db.update(webhookEvents).set({ status: "failed", lastError: message }).where(eq(webhookEvents.stripeEventId, event.id));
    throw error;
  }
}
