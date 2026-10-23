import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const regionEnum = pgEnum("region", ["US", "CA"]);
export const tipBaseEnum = pgEnum("tip_base", ["pre_tax", "pre_tax_plus_fees", "pre_discount", "post_tax"]);
export const planEnum = pgEnum("plan", ["free", "pro"]);
export const webhookEventStatusEnum = pgEnum("webhook_event_status", ["pending", "processed", "failed"]);

export const userSettings = pgTable(
  "user_settings",
  {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    region: regionEnum("region").notNull().default("US"),
    currency: text("currency").notNull().default("USD"),
    defaultTipBps: integer("default_tip_bps").notNull().default(1800),
    defaultTipBase: tipBaseEnum("default_tip_base").notNull().default("pre_tax"),
    isWorker: boolean("is_worker").notNull().default(false),
    plan: planEnum("plan").notNull().default("free"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("user_settings_currency_format", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check("user_settings_tip_bps_range", sql`${table.defaultTipBps} between 0 and 10000`),
  ],
);

export const workplaces = pgTable(
  "workplaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultWageCents: integer("default_wage_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workplaces_user_id_idx").on(table.userId),
    uniqueIndex("workplaces_id_user_id_idx").on(table.id, table.userId),
    check("workplaces_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("workplaces_default_wage_non_negative", sql`${table.defaultWageCents} is null or ${table.defaultWageCents} >= 0`),
  ],
);

export const shifts = pgTable(
  "shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    workplaceId: uuid("workplace_id").references(() => workplaces.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    hoursX100: integer("hours_x100").notNull().default(0),
    baseWageCents: integer("base_wage_cents").notNull().default(0),
    salesCents: integer("sales_cents"),
    cashTipsCents: integer("cash_tips_cents").notNull().default(0),
    cardTipsCents: integer("card_tips_cents").notNull().default(0),
    tipOutCents: integer("tip_out_cents").notNull().default(0),
    serviceChargeShareCents: integer("service_charge_share_cents").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("shifts_user_date_idx").on(table.userId, table.date),
    foreignKey({
      name: "shifts_workplace_user_fk",
      columns: [table.workplaceId, table.userId],
      foreignColumns: [workplaces.id, workplaces.userId],
    }),
    check("shifts_hours_x100_non_negative", sql`${table.hoursX100} >= 0`),
    check("shifts_base_wage_non_negative", sql`${table.baseWageCents} >= 0`),
    check("shifts_sales_non_negative", sql`${table.salesCents} is null or ${table.salesCents} >= 0`),
    check("shifts_cash_tips_non_negative", sql`${table.cashTipsCents} >= 0`),
    check("shifts_card_tips_non_negative", sql`${table.cardTipsCents} >= 0`),
    check("shifts_tip_out_non_negative", sql`${table.tipOutCents} >= 0`),
    check("shifts_service_charge_share_non_negative", sql`${table.serviceChargeShareCents} >= 0`),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripePriceId: text("stripe_price_id").notNull(),
    status: text("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    lastEventCreatedAt: integer("last_event_created_at").notNull().default(0),
    lastEventId: text("last_event_id").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("subscriptions_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
    check("subscriptions_period_order", sql`${table.currentPeriodEnd} is null or ${table.currentPeriodStart} is null or ${table.currentPeriodEnd} >= ${table.currentPeriodStart}`),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    stripeEventId: text("stripe_event_id").primaryKey(),
    type: text("type").notNull(),
    eventCreatedAt: integer("event_created_at").notNull(),
    status: webhookEventStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(1),
    lastError: text("last_error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, { fields: [userSettings.userId], references: [user.id] }),
}));

export const workplacesRelations = relations(workplaces, ({ one, many }) => ({
  user: one(user, { fields: [workplaces.userId], references: [user.id] }),
  shifts: many(shifts),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  user: one(user, { fields: [shifts.userId], references: [user.id] }),
  workplace: one(workplaces, { fields: [shifts.workplaceId], references: [workplaces.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, { fields: [subscriptions.userId], references: [user.id] }),
}));

export const appSchema = { userSettings, workplaces, shifts, subscriptions, webhookEvents };
