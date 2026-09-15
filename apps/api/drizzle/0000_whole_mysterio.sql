CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"short_code" text NOT NULL,
	"category_number" smallint NOT NULL,
	"process_owner_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "areas_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "areas_category_number_check" CHECK ("areas"."category_number" in (1, 2, 3))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entra_object_id" text NOT NULL,
	"display_name" text NOT NULL,
	"mail" text,
	"is_author" boolean DEFAULT false NOT NULL,
	"is_process_owner" boolean DEFAULT false NOT NULL,
	"is_qm" boolean DEFAULT false NOT NULL,
	"is_administrator" boolean DEFAULT false NOT NULL,
	"area_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "users_entra_object_id_unique" UNIQUE("entra_object_id"),
	CONSTRAINT "users_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "process_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"edition" integer,
	"status" text NOT NULL,
	"author_id" uuid,
	"process_owner_id" uuid,
	"approved_by_qm_id" uuid,
	"change_reason" text,
	"submitted_at" timestamp with time zone,
	"content_reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"snapshot_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	"purpose" text,
	"scope_detail" text,
	"terms" text,
	"description_doc" jsonb,
	"description_text" text,
	"responsibilities" text,
	"work_sequence" text,
	"method" text,
	"process_parameters" text,
	"documentation_ref" text,
	"deviation_handling" text,
	"maintenance_ref" text,
	CONSTRAINT "process_versions_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "process_versions_process_edition_unique" UNIQUE("process_id","edition"),
	CONSTRAINT "process_versions_status_check" CHECK ("process_versions"."status" in ('backlog', 'in_capture', 'content_review', 'formal_review', 'approved'))
);
--> statement-breakpoint
CREATE TABLE "processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"short_description" text,
	"identifier" text,
	"document_number" integer,
	"edition" integer,
	"specification_type" text NOT NULL,
	"template_type" text NOT NULL,
	"scope" text,
	"status" text NOT NULL,
	"confidentiality" text,
	"has_active_draft" boolean DEFAULT false NOT NULL,
	"area_id" uuid NOT NULL,
	"author_id" uuid,
	"approved_by_qm_id" uuid,
	"current_version_id" uuid,
	"parent_process_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	"purpose" text,
	"scope_detail" text,
	"terms" text,
	"description_doc" jsonb,
	"description_text" text,
	"responsibilities" text,
	"work_sequence" text,
	"method" text,
	"process_parameters" text,
	"documentation_ref" text,
	"deviation_handling" text,
	"maintenance_ref" text,
	CONSTRAINT "processes_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "processes_area_document_number_unique" UNIQUE("area_id","document_number"),
	CONSTRAINT "processes_specification_type_check" CHECK ("processes"."specification_type" in ('VA', 'AA')),
	CONSTRAINT "processes_template_type_check" CHECK ("processes"."template_type" in ('IMS', 'PROD')),
	CONSTRAINT "processes_scope_check" CHECK ("processes"."scope" in ('PE', 'PER', 'PEL')),
	CONSTRAINT "processes_status_check" CHECK ("processes"."status" in ('backlog', 'in_capture', 'content_review', 'formal_review', 'approved')),
	CONSTRAINT "processes_confidentiality_check" CHECK ("processes"."confidentiality" in ('Öffentlich', 'Intern', 'Vertraulich'))
);
--> statement-breakpoint
CREATE TABLE "process_additional_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_version_id" uuid NOT NULL,
	"title" text NOT NULL,
	"value" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "process_additional_fields_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "process_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"blob_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"process_id" uuid NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "process_documents_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "process_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"process_version_id" uuid,
	"event_kind" text NOT NULL,
	"new_status" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"comment" text,
	"recipient_email" text,
	"is_sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"send_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "process_events_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "process_events_event_kind_check" CHECK ("process_events"."event_kind" in ('assigned', 'submitted', 'content_approved', 'content_rejected', 'formally_approved', 'formally_rejected', 'revision_started')),
	CONSTRAINT "process_events_new_status_check" CHECK ("process_events"."new_status" in ('backlog', 'in_capture', 'content_review', 'formal_review', 'approved'))
);
--> statement-breakpoint
CREATE TABLE "process_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_version_id" uuid NOT NULL,
	"link_type" text NOT NULL,
	"linked_process_id" uuid,
	"title" text,
	"url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "process_links_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "process_links_link_type_check" CHECK ("process_links"."link_type" in ('InternerProzess', 'ExternesDokument'))
);
--> statement-breakpoint
CREATE TABLE "instruction_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"blob_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"instruction_id" uuid NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "instruction_documents_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "instruction_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instruction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'Offen' NOT NULL,
	"notified_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"notify_status" text,
	"confirm_token_hash" text,
	"confirm_token_expires_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"source_ip" text,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "instruction_participants_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "instruction_participants_instruction_user_unique" UNIQUE("instruction_id","user_id"),
	CONSTRAINT "instruction_participants_status_check" CHECK ("instruction_participants"."status" in ('Offen', 'Bestätigt', 'Abgelehnt')),
	CONSTRAINT "instruction_participants_notify_status_check" CHECK ("instruction_participants"."notify_status" in ('In Bearbeitung', 'Fertig', 'Fehler'))
);
--> statement-breakpoint
CREATE TABLE "instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"instruction_type" text NOT NULL,
	"due_date" date,
	"recurrence" text DEFAULT 'Keine Wiederholung' NOT NULL,
	"note" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "instructions_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "instructions_instruction_type_check" CHECK ("instructions"."instruction_type" in ('Einzel', 'Sammel')),
	CONSTRAINT "instructions_recurrence_check" CHECK ("instructions"."recurrence" in ('Keine Wiederholung', 'Vierteljährlich', 'Halbjährlich', 'Jährlich'))
);
--> statement-breakpoint
CREATE TABLE "qualification_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"blob_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"qualification_id" uuid NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "qualification_documents_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"acquired_at" date,
	"expires_at" date,
	"skill_points" smallint,
	"reminder_sent_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "qualifications_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "qualifications_skill_points_check" CHECK ("qualifications"."skill_points" between 1 and 4)
);
--> statement-breakpoint
CREATE TABLE "user_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	CONSTRAINT "user_tasks_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_process_owner_id_users_id_fk" FOREIGN KEY ("process_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_process_owner_id_users_id_fk" FOREIGN KEY ("process_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_versions" ADD CONSTRAINT "process_versions_approved_by_qm_id_users_id_fk" FOREIGN KEY ("approved_by_qm_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_approved_by_qm_id_users_id_fk" FOREIGN KEY ("approved_by_qm_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_current_version_id_process_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."process_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_parent_process_id_processes_id_fk" FOREIGN KEY ("parent_process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_additional_fields" ADD CONSTRAINT "process_additional_fields_process_version_id_process_versions_id_fk" FOREIGN KEY ("process_version_id") REFERENCES "public"."process_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_documents" ADD CONSTRAINT "process_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_documents" ADD CONSTRAINT "process_documents_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_events" ADD CONSTRAINT "process_events_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_events" ADD CONSTRAINT "process_events_process_version_id_process_versions_id_fk" FOREIGN KEY ("process_version_id") REFERENCES "public"."process_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_events" ADD CONSTRAINT "process_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_links" ADD CONSTRAINT "process_links_process_version_id_process_versions_id_fk" FOREIGN KEY ("process_version_id") REFERENCES "public"."process_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_links" ADD CONSTRAINT "process_links_linked_process_id_processes_id_fk" FOREIGN KEY ("linked_process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruction_documents" ADD CONSTRAINT "instruction_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruction_documents" ADD CONSTRAINT "instruction_documents_instruction_id_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "public"."instructions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruction_participants" ADD CONSTRAINT "instruction_participants_instruction_id_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "public"."instructions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruction_participants" ADD CONSTRAINT "instruction_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_documents" ADD CONSTRAINT "qualification_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_documents" ADD CONSTRAINT "qualification_documents_qualification_id_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_events_process_created_idx" ON "process_events" USING btree ("process_id","created_at");