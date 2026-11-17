-- Attach real, professional test reports to a release (ASSERT-71).

-- Some releases have an external, authoritative test report (a pentest or an active scan). Those are
-- shown as a download link in place of the generated report body, and the generated finding counts are
-- hidden. The files are stored here and served only through a login-gated download route — they are
-- never committed to the (public) repo. Additive: a report with no file keeps its generated body.
CREATE TABLE security_report_files (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id    bigint NOT NULL REFERENCES security_reports(id) ON DELETE CASCADE,
  -- How the file is shown: a human label, an optional environment ('prod'/'dev'), the testing provider,
  -- and the date on the report itself.
  label        text NOT NULL,
  environment  text,
  provider     text,
  assessed_on  date,
  -- The download: a safe file name, its media type, and the bytes.
  filename     text NOT NULL,
  content_type text NOT NULL,
  bytes        bytea NOT NULL,
  position     int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- One file per (report, filename); re-attaching the same name replaces it (admin upsert).
CREATE UNIQUE INDEX security_report_files_report_filename ON security_report_files (report_id, filename);
-- List a report's files in display order.
CREATE INDEX security_report_files_report ON security_report_files (report_id, position, id);
