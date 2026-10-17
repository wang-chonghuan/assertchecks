# ASSERT-2 handoff

## What changed

- `db/migrations/002_triggers_and_selection.sql` (applied to the shared schema): optional
  `checks.period_seconds`; `checks.selection` (default status `active`, run `nightly`);
  `runs.trigger` (`schedule`/`manual`, default `manual`); `runs.cases` (named cases → partial run).
- `src/server/judge.ts`: `result` envelope — `playwright` (native report, existing parser) and
  `cases` (direct per-case results for non-test-runner producers) — parsed into one shape and
  judged by the same rules; expected set from the check selection or the named cases; tested
  versions as any component map, all recorded and unchanged.
- `src/server/status.ts`: status from the latest finished full run; Late only for checks with a
  period, anchored on the latest scheduled full run or the check's creation.
- `src/server/ingest.ts`: `trigger`, `cases`, `result`, and `error` for runs with no result
  (recorded as incomplete). Report identity (trigger, cases) is fixed at `start`.
- `src/server/queries.ts`, pages, `src/components/status.tsx`: latest full run only; partial-run
  notice; trigger tag; "manual only" / "every …, plus manual runs"; version rows per component.
- `public/client/assertchecks.mjs`: zero-dependency client served at `/client/assertchecks.mjs`
  (`start`, `report`, `--error`), GitHub Actions detection, upload-time credential check, token only
  from the environment.
- `scripts/admin.ts`: `--period <seconds|none>`, `--select-status`, `--select-run`, `--slug`.
- README: client usage and the push contract. Tests: judge/status rewritten for the new contract,
  new client tests (19 total).

## AC results

Local dev server on port 63002 against the shared database, ticket-scoped project `assert-2-test`
(user `assert-2@assertchecks.test`, checks `daily` every 1 d grace 2 h and `manual` with no period).
The client was downloaded from `http://localhost:63002/client/assertchecks.mjs`; versions were read
from the real DEV endpoints.

1. **Full report through the served client — passed.** Real NSDK reports from ENG-1632 with the
   catalog of `09339a1f9` (92 active nightly): 92/92 → run 16 `passed`; 91/1 → run 17 `failed`
   ("E2E-062 failed"); a missing report file → run 18 `incomplete` ("Runner reported no result …"),
   client exit 1. A transient DEV version read failure made run 21 `incomplete` ("deployed versions
   not recorded"), as the rules require. The check page shows all 92 cases with their Then results.
2. **Scheduled versus manual, and Late — passed.** After aging scheduled run 16 by 27 h, the daily
   check showed **Late** although manual run 19 (92/92, passed) was newer; its page shows run 19
   with a "Manual" tag. A named run of E2E-001/E2E-002 (run 20) appeared only as "A newer partial
   run of 2 named cases … passed" and did not replace run 19.
3. **No period is never late — passed.** The `manual` check, with its runs aged 400 days, shows
   **Up** and "manual only", next expected "—".
4. **NSDK local/dev/prod — applied and verified at deployment** (same database; changing NSDK's
   checks now would alter production before the code that understands them is live).

Mechanical defence passed: typecheck, 19 unit tests, build (client present in `.output/public/client/`
with gzip/brotli). ips-antdesign lint: 0 issues.

## Deviations

- The grill's Q1 answer was refined by the owner to an envelope that wraps formats instead of a
  client-side converter; implemented that way.
- `plan.md` was written alongside implementation, after the grill.

## Environment

Web port 63002. No env keys changed. Migration 002 applied to `assertchecks-schema` (additive).

## Residual

- Ticket-scoped data to remove at close: project `assert-2-test` (runs 16–22), user
  `assert-2@assertchecks.test`.
- The client's default origin is the current temporary domain; update it with the custom domain.
