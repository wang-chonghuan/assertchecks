-- ASSERT-49: automatic tickets for production errors. A project names where its tickets go (a Plane or
-- Linear project and an assignee, with the access key AssertChecks uses there) and an optional Slack
-- incoming webhook. The server files one ticket per error problem that needs one.
CREATE TABLE error_automation (
  project_id    bigint PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  platform      text CHECK (platform IN ('plane', 'linear')),
  -- The platform access key; never returned to a browser or a client.
  token         text,
  -- Plane: the workspace slug. Linear: unused.
  workspace     text,
  -- Plane: the project. Linear: the team, and optionally one of its projects.
  target_id     text,
  target_name   text,
  team_id       text,
  assignee_id   text,
  assignee_name text,
  slack_webhook text CHECK (slack_webhook IS NULL OR slack_webhook ~ '^https://hooks\.slack\.com/'),
  updated_by    text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((platform IS NULL) = (token IS NULL)),
  CHECK (platform IS DISTINCT FROM 'plane' OR workspace IS NOT NULL)
);

-- One automatic ticket per problem. A problem is claimed before the platform is called, so a crash or a
-- second process never files it twice; a failure is retried only after the automation settings change.
CREATE TABLE auto_tickets (
  problem_id  bigint PRIMARY KEY REFERENCES error_problems(id) ON DELETE CASCADE,
  state       text NOT NULL CHECK (state IN ('creating', 'created', 'failed')),
  url         text,
  error       text,
  config_at   timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
