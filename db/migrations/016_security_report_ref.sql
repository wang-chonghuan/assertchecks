-- Show the release branch and commit SHA on each security test report (ASSERT-70).

-- A security report stored the assessed version and a link to its commit, but never the release
-- branch it was cut from nor the commit SHA as text, so neither showed on the page. Add both as
-- nullable columns. Additive: existing rows keep NULL until re-seeded, and the page falls back to
-- showing nothing for a missing value.
ALTER TABLE security_reports ADD COLUMN branch     text;
ALTER TABLE security_reports ADD COLUMN commit_sha text;
