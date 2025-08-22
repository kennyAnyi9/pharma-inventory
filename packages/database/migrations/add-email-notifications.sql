-- Create email_notifications table
CREATE TABLE IF NOT EXISTS "email_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"drug_id" integer NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"subject" varchar(255) NOT NULL
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "email_drug_type_idx" ON "email_notifications" ("drug_id","notification_type");
CREATE INDEX IF NOT EXISTS "email_sent_at_idx" ON "email_notifications" ("sent_at");