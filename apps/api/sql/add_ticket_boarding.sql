-- Production boarding + STAFF role.
-- Apply against the application database before gate scans with action=board.

-- Seat-level boarding (preferred: one passenger / one QR / one board).
ALTER TABLE "public"."BookingSeat"
  ADD COLUMN IF NOT EXISTS "boardedAt" TIMESTAMPTZ NULL;

ALTER TABLE "public"."BookingSeat"
  ADD COLUMN IF NOT EXISTS "boardedByUserId" TEXT NULL;

CREATE INDEX IF NOT EXISTS "booking_seat_boarded_at_idx"
  ON "public"."BookingSeat" ("boardedAt");

-- Optional ticket-level columns kept for compatibility with earlier scan builds.
ALTER TABLE "public"."Ticket"
  ADD COLUMN IF NOT EXISTS "boardedAt" TIMESTAMPTZ NULL;

ALTER TABLE "public"."Ticket"
  ADD COLUMN IF NOT EXISTS "boardedByUserId" TEXT NULL;

-- Gate staff role (PostgreSQL enum label).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'STAFF'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'STAFF';
  END IF;
END$$
