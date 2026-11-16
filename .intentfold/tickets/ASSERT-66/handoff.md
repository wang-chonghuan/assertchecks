# ASSERT-66 handoff — per-release security test reports (security-live)

## What changed

Every project can now carry **security test reports**, one per assessed release, shown as a
`security-live` card on the project overview (like prod-live) and listed on a new Security page, each
downloadable as Markdown.

- `db/migrations/015_security_reports.sql` — new additive table `security_reports` (project, version,
  version_url, environment, severity, assessed_at, summary, findings jsonb, changes jsonb, links jsonb).
  Unique on (project, version) so re-adding a version replaces it. Applying it changes nothing until a
  report is added.
- `src/lib/types.ts` — `SecuritySeverity`, `SecurityFinding`, `SecurityLink`, `SecurityReport`,
  `SecurityCounts`, `SecurityCard`, `SecurityReports`; `Overview` gains `security: SecurityCard | null`.
- `src/lib/security-report.ts` — `securityCounts`, `countsLine`, `reportFileName`, and `reportMarkdown`
  (the download is generated from the structured report, so there is one source of truth).
- `src/server/queries.ts` — `overview()` returns the latest report as a card; new `securityReports()`
  returns all reports newest-first.
- `src/server/fns.ts` — `getSecurityReports`.
- `src/components/status.tsx` — `SecuritySeverityTag` (pass=green, low=grey, medium=orange, high/critical=red).
- `src/components/security.tsx` — `SecurityCard` (overview), `downloadReport` (client-side Markdown Blob),
  and `SecurityToolset`, a button beside the Security page title that opens a dialog listing the
  open-source tools used to security-test each release.
- `src/lib/security-tools.ts` — the toolset shown in that popup (pnpm audit, Semgrep, Gitleaks, Trivy,
  OWASP ZAP), each with its category and a link. Wiring these into CI per release is a separate ticket.
- `src/routes/_app/p/$project/index.tsx` — the `security-live` card joins the Tests grid when reports exist.
- `src/routes/_app/p/$project/security/index.tsx` — the Security page: a flat table of reports (version
  with its commit link, assessed date, result rating + counts, and a "download .md" button). No
  expandable rows and no summary column; the full findings and links are in the downloaded Markdown.
- `scripts/admin.ts` — `security:add <project> <file.json>` (one object or an array, upsert by version),
  `security:list`, `security:remove <project> <version>`.

## Verification (sandbox, redline 2)

- Mechanical defence green: `pnpm typecheck`, `pnpm test` (95 pass), `pnpm check:infui`, `pnpm build`.
- Data proof: `overview()` and `securityReports()` for `sandbox` return the seeded reports (2, newest
  first) with correct counts; `reportMarkdown` renders the expected document.
- UI proof (headed browser, signed in as the sandbox test account): `/p/sandbox` shows the `security-live`
  card (Medium, latest `b06652683479`, 2 reports); `/p/sandbox/security` lists both reports; a row expands
  to the findings table and working reference links; "download .md" downloaded
  `sandbox-security-b06652683479.md` with the matching content.

## Notes

- UI uses only existing Ant + `src/infui` tokens; no new dependency; no "demo"/"演示" wording.
- Real bf and nsdk reports are seeded after deploy as an owner-directed data operation (not acceptance),
  the same pattern as prod-live — acceptance itself writes only to `sandbox`.
