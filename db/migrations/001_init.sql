CREATE TABLE users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         text PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL
);

CREATE TABLE memberships (
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE checks (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id      bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug            text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text NOT NULL,
  environment     text NOT NULL,
  period_seconds  integer NOT NULL CHECK (period_seconds > 0),
  grace_seconds   integer NOT NULL CHECK (grace_seconds >= 0),
  ping_token_hash text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);

CREATE TABLE runs (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  check_id       bigint NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  started_at     timestamptz NOT NULL,
  finished_at    timestamptz,
  outcome        text NOT NULL CHECK (outcome IN ('running', 'passed', 'failed', 'incomplete')),
  outcome_reason text,
  exit_code      integer,
  test_sha       text,
  runner_kind    text,
  run_url        text,
  deployed_start jsonb,
  deployed_end   jsonb,
  report         jsonb,
  catalog        jsonb,
  summary        jsonb,
  CHECK ((outcome = 'running') = (finished_at IS NULL))
);

CREATE INDEX runs_check_started_idx ON runs (check_id, started_at DESC);
