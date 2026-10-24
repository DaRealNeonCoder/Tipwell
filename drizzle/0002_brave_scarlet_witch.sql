ALTER TABLE "shifts" ADD COLUMN "card_tip_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "section" text;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "daypart" text;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "prep_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_card_tip_fee_non_negative" CHECK ("shifts"."card_tip_fee_cents" >= 0);--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_prep_minutes_non_negative" CHECK ("shifts"."prep_minutes" >= 0);