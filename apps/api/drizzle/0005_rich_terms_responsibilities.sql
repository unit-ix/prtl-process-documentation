ALTER TABLE "process_versions" ADD COLUMN "terms_doc" jsonb;--> statement-breakpoint
ALTER TABLE "process_versions" ADD COLUMN "responsibilities_doc" jsonb;--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "terms_doc" jsonb;--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "responsibilities_doc" jsonb;