CREATE TYPE "public"."submitted_via" AS ENUM('lider', 'link');--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "submitted_via" "submitted_via" DEFAULT 'lider' NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_share_token_unique" UNIQUE("share_token");