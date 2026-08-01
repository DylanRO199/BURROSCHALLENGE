ALTER TABLE "players" ADD COLUMN "active_game_start_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "active_game_queue_id" integer;