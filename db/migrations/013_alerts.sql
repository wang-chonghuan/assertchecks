-- BF alert notification and no-response escalation (ASSERT-56).

-- Per-project alert configuration: Twilio credentials (stored like the ticket-platform key), the caller
-- number, and the ordered contacts. Only BF is configured. Secrets live only here, never shown again.
CREATE TABLE alert_config (
  project_id          bigint PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  twilio_account_sid  text,
  twilio_api_key_sid  text,
  twilio_api_secret   text,
  twilio_from         text,
  -- [{ "role": "primary|backup|final", "name": ..., "slack_id": ..., "phone": ..., "email": ... }]
  contacts            jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(contacts) = 'array'),
  -- Out-of-hours on-call rotation (ASSERT-56): an ordered list of roles, e.g. ["final","primary","backup"],
  -- and the first handover instant (a Monday 09:00 Ireland). Outside working hours a critical ticket rings the
  -- week's on-call person instead of the fixed primary; floor((now - rotation_start) / 7 days) mod length picks
  -- the week, so the handover falls on each Monday 09:00 (a DST change can shift that moment by an hour).
  rotation            jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rotation) = 'array'),
  rotation_start      timestamptz,
  updated_by          text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- One escalation record per filed ticket that needs a response (urgent or critical). low tickets get no
-- row: they only post Slack like before. Keyed by the ticket URL so an overflow ticket (many problems)
-- still has exactly one escalation.
CREATE TABLE ticket_escalations (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id   bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url          text NOT NULL,
  issue_id     text,
  platform     text NOT NULL CHECK (platform IN ('plane', 'linear')),
  severity     text NOT NULL CHECK (severity IN ('urgent', 'critical')),
  -- 0 = the first notice was sent; 1 = escalated to the backup; 2 = escalated to the final person.
  stage        int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  stage1_at    timestamptz,
  stage2_at    timestamptz,
  -- Out-of-hours re-ring pacing (critical): when the on-call person was last called, so the ring repeats
  -- about every 15 minutes rather than every pass.
  last_call_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by text,
  checked_at   timestamptz,
  -- Append-only notes: each notification attempt { stage, at, kind: 'slack'|'call', ok, detail }.
  log          jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (project_id, url)
);

-- The severity decided for each automatic ticket at filing (ASSERT-56); drives BF escalation, kept for the record.
ALTER TABLE auto_tickets ADD COLUMN severity text;
