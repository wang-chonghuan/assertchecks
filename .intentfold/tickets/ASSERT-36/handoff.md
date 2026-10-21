# ASSERT-36 handoff

## What changed

- Project page: antd `Tabs` — Tests (default, the existing cards unchanged) and Production errors
  (`?tab=errors`). The errors tab is rendered and queried only once opened.
- `src/components/production-errors.tsx`: headline (to triage, how many this week and new, with a
  ticket and still occurring, failures in the last 24 h vs the day before), 30 daily bars with the
  peak, To triage (problems with nothing in 7 days folded), With a ticket, and folded Quiet for
  30+ days, Not handling and Filtered noise (7 days, by category). A row expands to where, app role,
  message variants with counts, the latest failure with its stack, and the problems that appeared
  together. Attach ticket / Change ticket / Not handling (with a reason) / Undo.
- `src/server/telemetry.ts`: four KQL queries against the project's Log Analytics workspace through
  `DefaultAzureCredential` (managed identity in production, `az login` locally), cached 5 minutes:
  failure buckets, message variants with the latest sample, noise summary, slow hours. The
  de-duplication rules are in the queries; Azure errors are reported with their innermost reason.
- `src/server/problems.ts` (pure, unit-tested): groups, statuses, since-ticket counts, headline,
  daily bars, co-occurrence, and dropping stored problems the telemetry now counts as noise.
- `src/server/production-errors.ts`: membership-scoped read, upsert of first/last seen, decisions.
  `queries.ts` exports its membership lookup `project()` for it.
- `src/server/fns.ts`: `getProductionErrors` (GET), `decideProblem` (POST; http(s) ticket URL or a
  one-line reason).
- `db/migrations/006_production_errors.sql`: `error_sources`, `error_problems` (additive).
- `scripts/admin.ts`: `source:set`, `source:remove`, sources in `list`.
- Dependencies (owner-approved): `@azure/identity` 4.13.3, `@azure/monitor-query-logs` 1.0.0.
- Charter (owner-authorized edit, in this ticket): product.md gains the production-errors view,
  non-goals and redlines (no stored project keys, no writes to project telemetry); engineering.md
  read model, stack and modules; operations.md identity, connect commands, role check, redline 9 and
  the dev server's `--host 127.0.0.1`; ui.md the new component.
- Azure (owner-approved): `ca-assertchecks` now has a system-assigned identity with Log Analytics
  Reader on `log-benefits-prod` and `log-nsdk-n0k21`, nothing else. The real `bf` and `nsdk`
  projects are connected to those workspaces with `source:set`.

## AC results

Local server on 63036, signed in as `assert-36+clerk_test@example.com`, built-in browser at 1440×900
and 390×844. Ticket projects `assert-36-bf` / `assert-36-nsdk` read the real BF / NSDK workspaces.

1. `/p/assert-36-bf` opens on Tests with the same empty-project card as before.
2. Errors tab headline "14 to triage (2 this week) · 2 with a ticket, 1 still occurring · 4 failures
   in the last 24 h (1 the day before)" and 30 bars with "Peak 15 failures on 2026-09-29".
3. Filtered noise on BF: 4xx 787 (401 GET /auth/session 593, …), scanner 0, aborted 0, blocked
   analytics 15 595 (google-analytics, clarity), "Script error." 12. No "Script error." problem row.
   On NSDK the aborted gRPC exception left the problem list once recognised by its ProblemId.
4. BF: `redis.exceptions.TimeoutError` 15 failures in 90 days against 30 records (KQL); the generic
   `TimeoutError` keeps only the 7 chat timeouts; `TelemetryQueryError` is its own problem (3);
   the `M_ID` browser error counts 1 page visit against 65 records.
5. Expanded NSDK `TimeoutError`: three message variants with counts and last time, latest stack, and
   "Appeared together with" naming the 9 errors of the 2026-09-02 burst. The 10-08 SchemaStoreError
   pair and the 10-04 ConnectionRefused / CannotConnectNow pair each carry a hint.
6. Attach ticket, Not handling with a reason, and Undo of both moved rows between groups and changed
   the counts (Not handling removed its failure from the 24 h figure). After reload the state held;
   `psql` showed decision, URL or reason, `decided_by` and `decided_at`.
7. The same ticket URL on `redis.exceptions.TimeoutError` and `TimeoutError`: both rows showed it.
8. With a ticket: "Still occurring: 5 failures since the ticket" (ticket backdated three days on the
   ticket project to show a ticket older than its latest failures) and "No occurrence since the
   ticket". No "resolved"/"solved" anywhere on the page (checked on the page text).
9. BF shows "Quiet for 30+ days (13)"; unit test covers leaving and returning to the working lists.
10. Real slow hours appear as Slow problems (BF `POST /auth/submit-solution` p95 1076 ms vs 86 ms
    usual); unit test covers the slow rows and that they are not failures.
11. `/p/assert-36-none?tab=errors` shows "Not connected".
12. `/p/assert-36-other?tab=errors` is the 404 page. Direct calls: read returns null; deciding on a
    problem through a project the user is not in, or another project's problem through a project the
    user is in, returns false and changes nothing.
13. `pnpm admin list` shows the `bf` and `nsdk` sources.

Mechanical defence: `pnpm typecheck && pnpm test && pnpm build` pass (47 tests); antd lint 0 issues;
no page-level horizontal scroll at 390×844 (tables scroll inside their cards).

## Deviations

- Sources store the workspace customer ID as well as the resource ID: the owner's own Azure login can
  query a workspace by ID but is denied resource-scoped queries, so queries use the ID and the
  resource ID is kept for the Azure link.
- Stored problems the telemetry still covers but now classifies as noise are not shown unless someone
  decided on them, so a noise rule change does not leave dead rows.
- After the look-through-the-owner's-eyes review: untriaged problems with nothing in 7 days are
  folded, ticket links show in full, rows give two counts (7 and 90 days), and the bars name the peak.

## Environment

Port 63036 (`.claude/launch.json` in the main checkout, untracked, starts it). No env keys added.
Migration 006 is applied to the shared database. Azure identity and two role assignments as above.

## Residual

- Production has not run the new code: managed-identity reading is proven only by the role
  assignments; the deploy's first page view is the real check.
- Slack alerts (agreed as a separate ticket); connecting the owner's own three projects (each needs
  App Insights in its own code); NSDK front-end errors are not collected; no version is recorded with
  errors, so "seen in which release" is not possible yet.

## Check

1. http://127.0.0.1:63036/p/assert-36-bf?tab=errors — whether slow operations belong in the same
   list and count as "to triage" (the reviewer expected them in a separate section, flagged only when
   slowness repeats).
2. Same page, With a ticket — two problems sharing one ticket stay two rows; the reviewer expected
   one combined entry.
3. http://127.0.0.1:63036/p/assert-36-nsdk?tab=errors — whether the headline, the folding of quiet
   untriaged problems and the "appeared together" hints read right for a daily look.
4. http://127.0.0.1:63036/p/assert-36-bf — the Tests tab is unchanged.

Sign in as `assert-36+clerk_test@example.com` with code 424242.

## Decided for you

- One production workspace per project, with an optional app-role filter for shared workspaces.
- Problems come from exceptions only: every 5xx in both projects has an exception in the same request.
- Noise: 4xx, scanner paths, client-aborted requests, blocked analytics calls, "Script error.".
  Browser-extension errors stay problems for you to mark Not handling.
- Slow: an hour with ≥10 requests whose p95 is ≥1 s and ≥2× the operation's 30-day p95.
- Appeared together: first seen within an hour, or at least half their active hours shared.
- No background job yet; the tab reads on open with a 5-minute cache.
- Any project member can attach a ticket or mark Not handling; who and when are kept.
- Interface text in English; noise window 7 days; headline window 24 h.
