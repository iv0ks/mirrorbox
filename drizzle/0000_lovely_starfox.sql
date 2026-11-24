CREATE TABLE "dossiers" (
	"id" integer PRIMARY KEY NOT NULL,
	"uuid" uuid NOT NULL,
	"owner_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"classification" text DEFAULT 'internal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dossiers_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;