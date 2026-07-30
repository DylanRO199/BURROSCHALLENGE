CREATE TYPE "public"."refresh_status" AS ENUM('idle', 'refreshing', 'temporary_error', 'riot_api_key_invalid');--> statement-breakpoint
CREATE TABLE "player_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"match_id" text NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"queue_id" integer NOT NULL,
	"champion_name" text NOT NULL,
	"win" boolean NOT NULL,
	"kills" integer NOT NULL,
	"deaths" integer NOT NULL,
	"assists" integer NOT NULL,
	"duration_seconds" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"riot_id" text NOT NULL,
	"platform" text NOT NULL,
	"game_name" text,
	"tag_line" text,
	"puuid" text,
	"account_cluster" text,
	"profile_icon_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"error_category" text
);
--> statement-breakpoint
CREATE TABLE "rank_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"tier" text NOT NULL,
	"division" text,
	"league_points" integer NOT NULL,
	"season_wins" integer NOT NULL,
	"season_losses" integer NOT NULL,
	"profile_icon_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_leases" (
	"id" text PRIMARY KEY NOT NULL,
	"lease_until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone,
	"timezone" text NOT NULL,
	"refresh_ttl_seconds" integer NOT NULL,
	"last_attempted_at" timestamp with time zone,
	"last_successful_at" timestamp with time zone,
	"refresh_status" "refresh_status" DEFAULT 'idle' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_matches" ADD CONSTRAINT "player_matches_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rank_snapshots" ADD CONSTRAINT "rank_snapshots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_matches_player_match_unique" ON "player_matches" USING btree ("player_id","match_id");--> statement-breakpoint
CREATE INDEX "player_matches_player_played_idx" ON "player_matches" USING btree ("player_id","played_at");--> statement-breakpoint
CREATE UNIQUE INDEX "players_riot_id_unique" ON "players" USING btree ("riot_id");--> statement-breakpoint
CREATE INDEX "rank_snapshots_player_observed_idx" ON "rank_snapshots" USING btree ("player_id","observed_at");