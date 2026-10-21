# ASSERT-34 handoff

## Investigation (why the NSDK nightly went from 19 to 14 failures)

DEV ran the same code on both nights (web and API 4c8ac2f9d5de). The change came from data that NSDK
republishes daily and from unstable checks, not from fixes:

- Recovered: 054, 064, 145, 175, 177 (the Money-out metric detail HTTP 500 did not occur that night),
  125 (model quote), 141 (Project generation), 153 (workings shown correctly).
- Newly failing: 094 (September total 2,875.00 short of the raw ledger — its known month-boundary
  defect), 012 and 179 (model judgement).
- Still failing at a later step: 151, 152, 176, now that the metric detail answered.

Of the 14: product defects 094, 151, 168, 172, 180, 197, 198, 199, 201; to settle 152 (rule versus
"€45k" display) and 176 (bill time zone Europe/Dublin versus expected London); unstable 012, 179;
120 timed out on both nights. The full write-up is the ticket comment of 2026-10-21.

Because a single run hides defects that come and go, the owner asked for a run history.

## What changed

- `src/server/queries.ts`: `recentRuns` lists a check's 50 newest runs; `finishedRun` loads any finished
  run of the check; `checkDetail` and `caseDetail` take an optional run number and return the run
  history (and, for a case, its result in each run). The card and status still come from the latest
  full run. A named-case run lists no "not in this run" cases and no catalog changes.
- `src/server/fns.ts`: `getCheck` and `getCase` accept an optional run number (digits only).
- `src/lib/types.ts`: `RunHistoryItem`, `CaseHistoryItem`, and `viewingLatest` / `history` fields.
- Check page: a "Run history" card under the summary — run number, start time, Scheduled / Manual
  and named-case count, outcome with "N failed of M", test commit SHA and deployed SHAs per
  component. A run number opens that run's full results at `?run=<n>` with a banner and "Back to
  latest"; case links keep the run.
- Case page: opens in the chosen run and lists "Result in each run".

## AC results

1. Ticket project `assert-34` fed three real NSDK result files (runs 62 scheduled, 63 manual, 64 named
   cases). The history lists all three with kind, outcome, tally, test and deployed SHAs.
2. `?run=62` shows run 62's own result (18 failed of 160) with the banner; `?run=63` on E2E-012 shows
   that run's failure and the per-run list Passed / Failed / Passed.
3. 1440×900 and 390×844: no page-level horizontal scroll.
4. `pnpm typecheck && pnpm test && pnpm build` pass (39 tests); antd lint passes.

## Deviations

None from the request. The per-case history was added because it is what makes a flaky case visible.

## Environment

Port 63034. No env keys or migrations.

## Residual

Settling 152 and 176, and the 120 timeout, belongs with NSDK's cases, not here.

## Check

1. http://localhost:63034/p/assert-34/checks/dev — the Run history card and opening #62.
2. http://localhost:63034/p/assert-34/checks/dev/cases/E2E-012?run=63 — Result in each run.

Sign in as `assert-34+clerk_test@example.com` with code 424242.

## Decided for you

- The history shows the 50 newest runs, five per page on the check page.
- A still-running run is listed but not openable until it reports.
