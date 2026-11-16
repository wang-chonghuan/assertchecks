# ASSERT-68 handoff — a shareable page per security report

## What changed

Each security test report now has its own page at a stable, shareable URL that shows the run's
metadata and the full report content (the same content as the Markdown download), rendered natively.

- `src/routes/_app/p/$project/security/$version/index.tsx` — new route `/p/<project>/security/<version>`.
  Header: a breadcrumb title (project / Security / version), a **Copy link** button (copies the page's
  URL) and a **Download .md** button. Body: `SecurityReportBody`.
- `src/components/security.tsx` — new `SecurityReportBody`: metadata (version with its commit link,
  environment, assessed, result), the summary, a per-scanner **Tools** table (scanner, version,
  coverage, result) and the findings grouped **by scanner**, plus the links. Also a small `Finding`
  row component.
- `src/lib/security-report.ts` — exported `groupByScanner` and `groupResult`; `reportMarkdown` now
  builds its Tools table and scanner sections from `groupByScanner`, so the page and the Markdown share
  one grouping (one source of truth).
- `src/server/queries.ts` — `securityReport(viewer, slug, version)` reads one report.
- `src/server/fns.ts` — `getSecurityReport`.
- `src/routes/_app/p/$project/security/index.tsx` — the list's Version column now links to the report's
  page (the commit link moved onto that page's metadata).

## Verification (sandbox, redline 2)

- Mechanical defence green: `pnpm typecheck`, `pnpm test` (95 pass), `pnpm check:infui`, `pnpm build`.
- UI proof (signed-in browser): `/p/sandbox/security/b06652683479` shows the breadcrumb, Copy link +
  Download .md, the metadata, the Tools table (all five scanners with pinned versions) and the findings
  under Nuclei (SEC-01/SEC-02 with their reference links) — the other scanners show "No findings". The
  list page's version link opens this page.

## Notes

- No migration, no new dependency. The page renders the structured report natively (no Markdown parser);
  the `.md` download is unchanged and uses the same grouping.
