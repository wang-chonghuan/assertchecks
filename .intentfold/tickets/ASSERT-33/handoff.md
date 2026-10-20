# ASSERT-33 handoff

Display-only rework of the check card, the check page and the case page, designed with
ips-content-design (brief in `plan.md`). No server function, query, judge, schema or returned type
changed.

## What changed

- `src/components/check-summary.tsx`: the card answers "of the cases that ran, how many failed?" —
  the failed count (or passed count when none failed) with "of N run", a bar of ran cases only, and a
  legend for what the headline does not say. Draft, manual and the catalog total left the card. A
  single "Ran …" line opens an "About this run" popover with how it started, the schedule, a later
  named-case run, and the cases outside the run. A run in progress is one quiet line; catalog
  changes keep their warning.
- `src/routes/_app/p/$project/checks/$check/index.tsx`: title is the check name only; tabs are Not
  passed / Passed / Not in this run (draft and manual merged with a reason tag); the All tab, the Tags
  and Duration columns and the long filter note are gone; failed rows show the unpassed Thens and the
  error's first line, with the full error in a collapsed row (errors hidden below md); table headers
  show once per tab instead of once per group.
- `src/routes/_app/p/$project/checks/$check/cases/$case.tsx`: the case's result and its investigated
  cause (the catalog's `failure`) come first, then Given / When / Then with each Then's status; the
  error output and the group / tags / type / run policy / status sit in collapsed sections.
- `src/components/status.tsx`: removed the two notice components this change left unused.

## AC results

1. Card at 1440×900 and 390×844 (project page, check page, homepage example): "19 failed of 160 run",
   bar of ran cases, "140 passed · 1 didn't finish", "Ran 2026-10-20 22:24 UTC"; no draft, manual
   or total count on the card. The popover shows Started, Schedule, Later run and "Not in the run:
   20 draft, 20 manual (of 200 catalog cases)". Pass.
2. Check page: tabs Not passed (20) / Passed (140) / Not in this run (40); no All tab; failed rows show
   ID, title, unpassed Thens and the error's first line; Run details collapsed by default. Pass.
3. Case page E2E-168: Failed tag, latest run time, "Known cause" with the catalog's failure note,
   then the spec; Error output and Case details collapsed. Pass.
4. `pnpm typecheck && pnpm test && pnpm build` pass (39 tests); antd lint passes. No page-level
   horizontal scroll at 390 px.

Data: ticket project `assert-33` / check `dev`, fed NSDK's real run files (local runs 59 and 60).
Nothing was written to `nsdk` or `bf`.

## Deviations

The tab is "Not passed (20)", not "Failed": it holds 19 failed cases and 1 that did not finish, and
"Failed (20)" contradicted the headline. Catalog changes keep a warning on the card rather than
moving into the popover, because they mean required coverage was dropped.

## Environment

Port 63033. No env keys changed.

## Residual

None.

## Check

1. http://localhost:63033/p/assert-33 — the card: is "19 failed of 160 run" the answer you wanted,
   and is anything you need missing from the card itself?
2. http://localhost:63033/p/assert-33/checks/dev — the Not passed tab and the "About this run" popover
   (the ⓘ after "Ran …").
3. http://localhost:63033/p/assert-33/checks/dev/cases/E2E-168 — result and known cause first.

Sign in as `assert-33+clerk_test@example.com` with code 424242.

## Decided for you

- When nothing failed the headline shows the passed count; a plain pass or fail adds no extra tag.
- "didn't finish" names the not-run bucket on the card (interrupted, skipped, flaky or missing).
- The case page shows "Runs: In every full run / Only when named" instead of nightly / manual.
