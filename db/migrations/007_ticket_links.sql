-- ASSERT-37: tickets on failing cases and on production problems. A case or a problem can carry several
-- tickets over time; none replaces another. A case is named by its catalog ID within the project, so
-- every check (environment) of the project shares its tickets.
CREATE TABLE ticket_links (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  case_id     text CHECK (case_id ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'),
  problem_id  bigint REFERENCES error_problems(id) ON DELETE CASCADE,
  url         text NOT NULL CHECK (url ~* '^https?://' AND length(url) <= 256),
  attached_by text NOT NULL,
  attached_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((case_id IS NULL) <> (problem_id IS NULL))
);

CREATE UNIQUE INDEX ticket_links_case_url ON ticket_links (project_id, case_id, url) WHERE case_id IS NOT NULL;
CREATE UNIQUE INDEX ticket_links_problem_url ON ticket_links (problem_id, url) WHERE problem_id IS NOT NULL;

-- A problem's single ticket from ASSERT-36 becomes its first link. The old columns stay until a later
-- migration; the code no longer reads decision = 'ticket'.
INSERT INTO ticket_links (project_id, problem_id, url, attached_by, attached_at)
SELECT project_id, id, ticket_url, coalesce(decided_by, 'unknown'), coalesce(decided_at, now())
FROM error_problems WHERE decision = 'ticket' AND ticket_url IS NOT NULL;
