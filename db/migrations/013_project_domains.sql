-- Project email-domain groups (ASSERT-55): a signed-in user whose verified email domain is listed here
-- may view the project read-only, without an individual membership. Editing still needs a membership.
CREATE TABLE project_domains (
  project_id bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain     text   NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, domain)
);
