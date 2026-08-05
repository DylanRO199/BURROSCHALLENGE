ALTER TABLE "players" ADD COLUMN "blue_shell_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "shield_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "active_punishments" text DEFAULT '[]';