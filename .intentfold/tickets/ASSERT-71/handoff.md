# ASSERT-71 handoff — attach real test reports with a download link

Releases with a real external report (pentest/scan) now show a login-gated download link in place of the
generated body, and hide all generated finding counts.

- `db/migrations/017_security_report_files.sql` — new `security_report_files` table (bytea in DB, upsert by report+filename).
- `src/lib/types.ts` — `SecurityReportFile`; `SecurityReport.files`; `SecurityCard.latest.hasReport`.
- `src/server/queries.ts` — load files per report; `securityReportFile(viewer, slug, version, id)` for the download (project access gate).
- `src/routes/api/p/$project/security/$version/file/$fileId.ts` — GET download, sign-in required, streams bytes as attachment.
- `src/components/security.tsx` — card hides counts/summary and shows "Security test report available" when `hasReport`; report body shows a **Reports** download section and hides summary/scope/tools/findings/remediation/standards/counts.
- list + per-report page — hide counts and the generated `.md` when files present; link to the real download(s).
- `scripts/admin.ts` — `security:attach` / `security:files` / `security:detach`.
- Data (owner-directed): s1→bf 1.5.6 (prod pentest), s3→bf 1.6.0 (prod retest), s2→bf 1.6.0 (dev Burp scan). Files stored in DB, never in the public repo.

Mechanical defence green: typecheck, 95 tests, check:infui, build.
