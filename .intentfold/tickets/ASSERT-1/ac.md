# ASSERT-1 acceptance checks

Live criteria are in Plane; this file is only how each is checked. Test data lives in a
ticket-scoped project `assert-1-test` with user `assert-1@assertchecks.test` and one check, created
with `pnpm admin` and removed at close. Runs are pushed through the existing API with `curl`.

## AC 1 — only the latest run is visible

Push two finished runs with different outcomes, then open the check page at 1440×900 and 390×844.
True when the page shows only the second run's outcome, per-case statuses and per-Then results, and
no element lists the first run.

## AC 2 — case text comes from the latest run's e2e

Push a third run whose catalog changes one case's title and a Then expectation. True when the check
page and that case's page show the changed text.

## AC 3 — no history anywhere; explicit empty state

Open the overview and a case page: no run strip, run list or history table. Create a second check
with no runs: its card and page show an explicit empty state. The old run URL returns 404.
