# ASSERT-6 acceptance checks

Live criteria are in Plane; this file is only how each is checked. Local server on port 63006
against the shared database; ticket-scoped project `assert-6-test` with a check whose latest full
run has non-passed cases and one whose latest full run passed; removed at close. Requirements added
later in this open ticket get their own section here.

## AC 1 — last opened project

Signed in, open project A, then visit `/`: lands on A. Open project B, sign out and sign in: lands on
B. Clear the cookie: lands on the first project by name. Remove the user's membership of the
remembered project: `/` does not land on it.

## AC 2 — overview card lists non-passed cases

The card of the check with non-passed cases lists their IDs and titles; the all-passed card shows no
such list.

## AC 3 — check page lists non-passed cases first

The check page shows a section above the full case table with each non-passed case, its failed or
not-run Then IDs and its error excerpt; the all-passed check shows no such section.

## AC 4 — cases outside the nightly run are shown (added 2026-10-17)

For NSDK DEV, the latest run's catalog has 6 draft cases and 1 manual case outside the check's
selection. The overview card and the check page list them with ID, title, draft/manual and the
catalog's `failure` note when present; retired cases are not listed; a check whose selection covers
every non-retired case shows no such list.
