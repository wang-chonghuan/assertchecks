-- A check's period is optional: a check without one is run on demand and is never late.
ALTER TABLE checks ALTER COLUMN period_seconds DROP NOT NULL;

-- Which catalog cases a full run of this check must execute.
ALTER TABLE checks ADD COLUMN selection jsonb NOT NULL
  DEFAULT '{"status": ["active"], "run": ["nightly"]}'::jsonb;

-- How a run was started, and whether it named its own cases instead of the check's selection.
ALTER TABLE runs ADD COLUMN trigger text NOT NULL DEFAULT 'manual'
  CHECK (trigger IN ('schedule', 'manual'));
ALTER TABLE runs ADD COLUMN cases jsonb;
