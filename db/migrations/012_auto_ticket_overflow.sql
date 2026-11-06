-- ASSERT-50: at most 10 automatic tickets per project in any 60 minutes; the rest of that hour's problems
-- share one overflow ticket. `filed_at` is when a problem's ticket was filed or it joined the overflow
-- ticket; `overflow` marks the problems on an overflow ticket.
ALTER TABLE auto_tickets ADD COLUMN overflow boolean NOT NULL DEFAULT false;
ALTER TABLE auto_tickets ADD COLUMN filed_at timestamptz;
UPDATE auto_tickets SET filed_at = updated_at WHERE state = 'created';
