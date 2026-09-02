CREATE TABLE IF NOT EXISTS "VhsCourse" (
	"uid" text PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"sourceId" text NOT NULL,
	"guid" text NOT NULL,
	"namespace" text NOT NULL,
	"courseNumber" text,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"dvvCode" text,
	"dvvBereich" text,
	"dvvLabel" text,
	"eventType" text,
	"level" text,
	"courseFormat" text DEFAULT 'praesenz' NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"startDate" text,
	"endDate" text,
	"sessionCount" integer,
	"weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timeStart" text,
	"timeEnd" text,
	"region" text,
	"postalCode" text,
	"venueName" text,
	"lat" real,
	"lon" real,
	"priceAmount" real,
	"priceReduced" real,
	"priceFree" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'unknown' NOT NULL,
	"bookingUrl" text,
	"semester" text,
	"contentHash" text NOT NULL,
	"data" jsonb NOT NULL,
	"sourceUpdatedAt" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "VhsCourse_city_idx" ON "VhsCourse" USING btree ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "VhsCourse_city_bereich_idx" ON "VhsCourse" USING btree ("city","dvvBereich");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "VhsCourse_city_region_idx" ON "VhsCourse" USING btree ("city","region");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "VhsCourse_city_format_idx" ON "VhsCourse" USING btree ("city","courseFormat");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "VhsCourse_city_guid_idx" ON "VhsCourse" USING btree ("city","guid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "VhsCourse_startDate_idx" ON "VhsCourse" USING btree ("startDate");