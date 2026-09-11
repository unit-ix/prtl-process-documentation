CREATE TYPE "public"."company_status" AS ENUM('prospect', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."contact_role" AS ENUM('decision_maker', 'influencer', 'user', 'other');--> statement-breakpoint
CREATE TYPE "public"."industry" AS ENUM('technology', 'manufacturing', 'retail', 'services', 'public_sector', 'other');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"industry" "industry" NOT NULL,
	"status" "company_status" NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"created_on" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"full_name" text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"role" "contact_role" NOT NULL,
	"company_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_on" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;