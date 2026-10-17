# ASSERT-6 rework

Changes after the frozen first delivery (`a67d6c7`), reconstructed once at close. The handoff is
unchanged; read it together with this file.

## Round 1 — environment results page (`5a6cb2e`)

Owner's ask: the check page is an environment's test-results page — a summary card with at least the
last run time and the total, passed, failed, draft and manual case counts, then one tab per category,
opening on the failed cases.

Change: the check page became a summary card (last run time, outcome, trigger, counts) plus
Failed / Passed / Draft / Manual / All tabs, `Failed` by default with errors expanded. Rechecked on
NSDK DEV run 30: 100 / 93 / 1 / 5 / 1, Failed tab active showing E2E-094; no horizontal overflow at
desktop and 375 px.

## Outside edit — run details folded into the summary card (`13435fa`)

An edit made outside this agent session in the ticket worktree moved run details from a separate
card into the summary card as a collapsible "Run details", with schedule and next expected time
always visible. Committed as found; kept by later rounds.

## Round 2 — no red banner (`5861110`)

Owner's ask: the summary card should not show the red banner naming what failed.

Change: the failure banner was removed; failed cases remain in the Failed tab. An incomplete run
still shows its reason in a yellow notice, because that reason appears nowhere else. Rechecked: no
alert on DEV run 30, Failed tab default.

## Round 3 — project cards show the overview (`7beb065`)

Owner's ask: on the project page, every environment card shows the overview content.

Change: one shared `CheckSummary` component and server-computed `counts` now render both the project
cards and the check page summary; the card case lists were replaced by the counts. Rechecked: DEV
card shows last run, Failed/Manual, 100/93/1/5/1, schedule and next expected; Local and PROD show
"No finished runs yet"; the check page numbers, tabs and run details are unchanged.

## Net effect relative to the handoff

AC 1 (last opened project) and AC 5 (tag colours) are unaffected. AC 2 is now met by the card's
red Failed count instead of a case list, per round 3. AC 3 and AC 4 are met by the Failed, Draft and
Manual tabs of the check page instead of separate sections, per round 1. Mechanical defence
(typecheck, 21 unit tests, build) and ips-antdesign lint passed on `7beb065`.
