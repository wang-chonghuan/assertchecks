# ASSERT-1 handoff

## What changed

- `src/server/queries.ts`: reads only each check's latest finished run (and a newer unreported run
  for a notice). `checkDetail` returns the check with that run's detail; case titles come from the
  run's own catalog. `caseDetail` takes the spec and result from the latest finished run and returns
  404 when that run's catalog does not declare the case. `runDetail` and all history/matrix queries
  were removed.
- `src/lib/types.ts`: `CheckCard` now has `latest` and `active`; new `LatestRun`; history,
  matrix and run-detail view models removed.
- Check page (`checks/$check/index.tsx`): shows the latest finished run — outcome and reason,
  times, exit code, test and deployed SHAs, runner link, and the case table with Then tags and
  expandable errors.
- Case page: Given/When/Then from the latest run's catalog with each Then's status, plus this case's
  result in that run; no history.
- Overview cards: latest finished run outcome and time, no run strip.
- Removed the run page (`runs/$run.tsx`) and `getRun`; old run URLs return the shared 404.
- `src/components/status.tsx`: `ActiveRunNotice` ("still running" / "timed out without reporting")
  replaces `RunStrip`, `Cell` and the tone helpers.
- No schema, API or data change; all runs remain stored.

## AC results

Local dev server on ticket port 63001 against the shared database, signed in as the ticket-scoped
user `assert-1@assertchecks.test` in project `assert-1-test`; runs pushed through the existing API.

1. **Only the latest run is visible — passed.** After a failed run (12, "Expected 3 rows") and a
   passed run (13), the check page showed only run 13: Passed, both cases Passed, A1/A2/A1 Passed,
   with no trace of run 12. Checked at the desktop pane width and at 375×812 (no page horizontal
   scroll; the case table scrolls inside its card).
2. **Case text comes from the latest run's e2e — passed.** Run 14 renamed E2E-001 to "Explore a
   renamed category view" and changed A1's expectation; both the check page and the E2E-001 case
   page showed the new text.
3. **No history anywhere; explicit empty state — passed.** The overview cards and case page have no
   run strip, run list or history table; the empty check shows "No finished runs yet." on its card
   and page; `/p/assert-1-test/runs/12` and `/cases/E2E-999` return HTTP 404.

Grill Q1 behaviour also checked: an unreported run (15) shows "A newer run started at … is still
running." while the page keeps showing run 14's results.

Mechanical defence: `pnpm typecheck && pnpm test && pnpm build` passed (10 unit tests).
ips-antdesign lint: 0 issues.

## Deviations

None from `plan.md`.

## Environment

Web port 63001 (`ticket.json`). No env keys added, changed or removed.

## Residual

- `Descriptions` with a responsive `column` renders antd's default column count on the server and
  re-lays out after hydration (visible as 3 → 2 columns on load). Pre-existing on every page.
- Ticket-scoped data to remove at close: project `assert-1-test` (checks `latest`, `empty`, runs
  12–15) and user `assert-1@assertchecks.test`.
