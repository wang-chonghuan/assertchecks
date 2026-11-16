-- Per-release security test reports shown on the project overview (ASSERT-66).

-- A project's security test reports, one per assessed release. Shown as a `security-live` card on the
-- project overview (like prod-live) and listed newest-first on /p/<project>/security, each downloadable
-- as Markdown. Additive: no project has a report until one is added, so the card appears only where
-- reports exist, and applying this migration changes nothing on its own.
CREATE TABLE security_reports (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id   bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- The assessed version (a commit SHA or a release label) and an optional link to it.
  version      text NOT NULL,
  version_url  text,
  environment  text NOT NULL DEFAULT 'prod',
  -- Overall risk rating: the highest open finding, or 'pass' when there are none.
  severity     text NOT NULL DEFAULT 'pass' CHECK (severity IN ('pass','low','medium','high','critical')),
  assessed_at  timestamptz NOT NULL,
  -- One or two sentences for the card and the list row.
  summary      text NOT NULL,
  -- [{ "id","severity","area","status","note","ref": { "label","url" } | null }]
  findings     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(findings) = 'array'),
  -- Release security changes (real commits/PRs): [{ "label","url" }]
  changes      jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(changes) = 'array'),
  -- Reference links (version, CI run, check page, standards): [{ "label","url" }]
  links        jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(links) = 'array'),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- One report per project+version; re-adding a version replaces it (admin upsert).
CREATE UNIQUE INDEX security_reports_project_version ON security_reports (project_id, version);
-- Newest first per project, for the card and the list.
CREATE INDEX security_reports_project_assessed ON security_reports (project_id, assessed_at DESC, id DESC);
