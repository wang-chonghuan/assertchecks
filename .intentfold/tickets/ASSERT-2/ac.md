# ASSERT-2 acceptance checks

Live criteria are in Plane; this file is only how each is checked. Local dev server on port 63002
against the shared database; ticket-scoped project `assert-2-test`, user `assert-2@assertchecks.test`,
checks `daily` (every 1 d, grace 2 h) and `manual` (no period); removed at close.

## AC 1 — a full report through the served client is judged by the existing rules

Download the client from `http://localhost:63002/client/assertchecks.mjs`, run `start`, then
`report` with a real Playwright report from the NSDK suite and its `e2e.json`. True when the outcome
and reasons follow the rules (skipped/missing/not-run Then are never passed) and the page shows it.

## AC 2 — scheduled versus manual runs, and Late

Push one scheduled full run, then several manual full runs. True when the status follows the latest
manual run while it is fresh; after moving the scheduled run's finish time beyond period + grace
(direct UPDATE on the ticket-scoped run) the check shows Late although manual runs are newer.

## AC 3 — a check without a period is never late

The `manual` check with old runs only shows Up/Failing, never Late, and "manual only".

## AC 4 — NSDK has local, dev and prod

After deployment, signed in as `support@narrativebanking.com`, project NSDK lists Local, DEV and
PROD; DEV keeps the existing token (a start/report with it is accepted).
