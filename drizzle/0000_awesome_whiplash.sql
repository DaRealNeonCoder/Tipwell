CREATE TYPE "public"."plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('US', 'CA');--> statement-breakpoint
CREATE TYPE "public"."tip_base" AS ENUM('pre_tax', 'pre_tax_plus_fees', 'pre_discount', 'post_tax');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workplace_id" uuid,
	"date" date NOT NULL,
	"hours_x100" integer DEFAULT 0 NOT NULL,
	"base_wage_cents" integer DEFAULT 0 NOT NULL,
	"sales_cents" integer,
	"cash_tips_cents" integer DEFAULT 0 NOT NULL,
	"card_tips_cents" integer DEFAULT 0 NOT NULL,
	"tip_out_cents" integer DEFAULT 0 NOT NULL,
	"service_charge_share_cents" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_hours_x100_non_negative" CHECK ("shifts"."hours_x100" >= 0),
	CONSTRAINT "shifts_base_wage_non_negative" CHECK ("shifts"."base_wage_cents" >= 0),
	CONSTRAINT "shifts_sales_non_negative" CHECK ("shifts"."sales_cents" is null or "shifts"."sales_cents" >= 0),
	CONSTRAINT "shifts_cash_tips_non_negative" CHECK ("shifts"."cash_tips_cents" >= 0),
	CONSTRAINT "shifts_card_tips_non_negative" CHECK ("shifts"."card_tips_cents" >= 0),
	CONSTRAINT "shifts_tip_out_non_negative" CHECK ("shifts"."tip_out_cents" >= 0),
	CONSTRAINT "shifts_service_charge_share_non_negative" CHECK ("shifts"."service_charge_share_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"region" "region" DEFAULT 'US' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"default_tip_bps" integer DEFAULT 1800 NOT NULL,
	"default_tip_base" "tip_base" DEFAULT 'pre_tax' NOT NULL,
	"is_worker" boolean DEFAULT false NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_currency_format" CHECK ("user_settings"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "user_settings_tip_bps_range" CHECK ("user_settings"."default_tip_bps" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "workplaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"default_wage_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workplaces_name_not_blank" CHECK (length(trim("workplaces"."name")) > 0),
	CONSTRAINT "workplaces_default_wage_non_negative" CHECK ("workplaces"."default_wage_cents" is null or "workplaces"."default_wage_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "workplaces_id_user_id_idx" ON "workplaces" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_workplace_user_fk" FOREIGN KEY ("workplace_id","user_id") REFERENCES "public"."workplaces"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "shifts_user_date_idx" ON "shifts" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "workplaces_user_id_idx" ON "workplaces" USING btree ("user_id");--> statement-breakpoint
