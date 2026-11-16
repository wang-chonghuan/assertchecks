# ASSERT-66 acceptance checks

1. **Security card.** A project with security test reports shows a `security-live` card in the Tests
   grid (same card shape and `-live` suffix as prod-live), with its risk rating, its latest version, the
   open-finding counts, and the number of reports.
2. **Reports page.** The card opens `/p/<project>/security`, which lists every report newest-first with
   version, environment, assessed date, result rating + counts and summary.
3. **Full report + links.** Opening a row shows the report in full: header, summary, a findings table
   (severity, area, status, note with its reference link), the release's security changes and the links.
   Every reference is a working external link.
4. **Markdown download.** Each row's "download .md" button downloads the report as Markdown, generated
   from the structured data (one source of truth); the file matches what the page shows.
5. **Additive & scoped.** No migration effect on existing data; the card appears only where reports
   exist; no new dependency; no "demo"/"演示" wording anywhere in the UI.
6. **Mechanical defence green:** `pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`.
