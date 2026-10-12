ALTER TABLE "process_events" DROP CONSTRAINT "process_events_event_kind_check";--> statement-breakpoint
ALTER TABLE "processes" ADD COLUMN "sub_number" smallint;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_parent_sub_number_unique" UNIQUE("parent_process_id","sub_number");--> statement-breakpoint
ALTER TABLE "process_events" ADD CONSTRAINT "process_events_event_kind_check" CHECK ("process_events"."event_kind" in ('assigned', 'submitted', 'content_approved', 'content_rejected', 'formally_approved', 'formally_rejected', 'revision_started', 'number_changed'));