-- One-time boarding fields for production ticket scans.
-- Apply against the application database before using action=board.

ALTER TABLE "public"."Ticket"
  ADD COLUMN IF NOT EXISTS "boardedAt" TIMESTAMPTZ NULL;

ALTER TABLE "public"."Ticket"
  ADD COLUMN IF NOT EXISTS "boardedByUserId" TEXT NULL;

CREATE INDEX IF NOT EXISTS "ticket_boarded_at_idx"
  ON "public"."Ticket" ("boardedAt");
