-- ASSERT-36: production errors. A project's production telemetry is the Log Analytics workspace named
-- here, read with AssertChecks's own Azure identity; no key is stored. Raw error events stay in that
-- workspace. AssertChecks keeps only the problems it derived from them and a person's decision on each.
CREATE TABLE error_sources (
  project_id     bigint PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  -- The workspace's customer ID, which queries address, and its Azure resource ID, for links.
  workspace_id   uuid NOT NULL,
  workspace_path text NOT NULL
    CHECK (workspace_path ~* '^/subscriptions/[^/]+/resourceGroups/[^/]+/providers/Microsoft\.OperationalInsights/workspaces/[^/]+$'),
  -- Only these app roles when several apps share the workspace; null reads every role.
  roles          text[] CHECK (roles IS NULL OR cardinality(roles) > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE error_problems (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- The exception's ProblemId, or the operation name for a slow operation.
  kind        text NOT NULL CHECK (kind IN ('error', 'slow')),
  key         text NOT NULL,
  first_seen  timestamptz NOT NULL,
  last_seen   timestamptz NOT NULL,
  -- A person's decision: a ticket is handling it, or it is not going to be handled. Null is untriaged.
  decision    text CHECK (decision IN ('ticket', 'ignored')),
  ticket_url  text,
  reason      text,
  decided_by  text,
  decided_at  timestamptz,
  UNIQUE (project_id, kind, key),
  CHECK (decision IS DISTINCT FROM 'ticket' OR ticket_url IS NOT NULL),
  CHECK (decision IS DISTINCT FROM 'ignored' OR reason IS NOT NULL),
  CHECK ((decision IS NULL) = (decided_at IS NULL))
);
