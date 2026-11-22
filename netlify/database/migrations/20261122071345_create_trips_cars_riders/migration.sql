CREATE TABLE "cars" (
	"id" serial PRIMARY KEY,
	"trip_id" text NOT NULL,
	"driver_name" text NOT NULL,
	"vehicle" text DEFAULT '' NOT NULL,
	"seats" integer NOT NULL,
	"leaving_from" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" serial PRIMARY KEY,
	"trip_id" text NOT NULL,
	"car_id" integer,
	"name" text NOT NULL,
	"pickup" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"destination" text NOT NULL,
	"meeting_point" text DEFAULT '' NOT NULL,
	"depart_at" timestamp with time zone NOT NULL,
	"return_at" timestamp with time zone,
	"notes" text DEFAULT '' NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cars_trip_idx" ON "cars" ("trip_id");--> statement-breakpoint
CREATE INDEX "riders_trip_idx" ON "riders" ("trip_id");--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_car_id_cars_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE SET NULL;