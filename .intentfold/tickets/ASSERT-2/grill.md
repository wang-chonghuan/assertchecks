# ASSERT-2 grill

Mode: Grill: human. Saved before asking; answers below.

## Q1. Which result format does the server accept?

Recommendation: keep Playwright's native JSON report as the single accepted format, parsed on the
server as today; the client only uploads it. The skill already mandates Playwright, and a second
neutral format plus a client-side converter would duplicate the parser now.
Alternative: a framework-neutral JSON with a client-side Playwright converter.

## Q2. How is the expected case set chosen, and what is a partial run?

Recommendation: each check stores a selection (default: catalog status `active` and run `nightly`).
A run may name explicit case IDs; it is then judged against exactly those cases and marked partial.
The check page and status keep showing the latest full run; the latest partial run, if newer, is
shown as a one-line notice with its outcome and case count.

## Q3. Triggers, periods and Late?

Recommendation: every run carries `trigger` = `schedule` or `manual` (default `manual`). A check's
period is optional. Status follows the latest finished full run of any trigger. Late applies only
to checks with a period and only scheduled runs refresh it; a scheduled check with no scheduled run
yet is measured from its creation time.

## Q4. Tested-version fields?

Recommendation: keep the API field names `deployed` / `deployedEnd`, but accept any component
names (for example `web`, `api`, `worker`) with SHA values; the page lists whatever was sent.

## Q5. How do projects get the client?

Recommendation: a zero-dependency single file `client/assertchecks.mjs` in this repository, served
by the site at `/client/assertchecks.mjs`, so its version always matches the server. Commands:
`start` (reads version URLs, returns run ID), `report` (uploads the Playwright report and catalog,
checks for credential-like strings first). Token only from `ASSERTCHECKS_PING_TOKEN`.

## Q6. NSDK checks?

Recommendation: three checks in project `nsdk`: `local` (manual only), `dev` (rename the existing
`dev-nightly` check, keeping its token; every 24 h, grace 2 h) and `prod` (manual only). New tokens
for `local` and `prod` go to the git-ignored `.credentials.local`.

## Answers

Answered by the owner on 2026-10-17:

- Q1: the alternative — a framework-neutral format — refined by the owner the same day: a neutral
  envelope that wraps formats instead of remapping them. `{"format": "playwright", "report": <native
  report>}` is uploaded unchanged and parsed on the server by the existing parser; `{"format":
  "cases", "cases": [...]}` serves non-Playwright producers such as the cron monitor. Both parse into
  one internal result judged by the same rules. The client converts nothing.
- Q2–Q6: accepted as recommended.
