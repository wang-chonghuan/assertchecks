# ASSERT-37 handoff

## What changed

- `db/migrations/007_ticket_links.sql`: `ticket_links` (a case ID or an error problem, URL, who, when;
  one row per subject and URL). ASSERT-36's single error ticket is copied in; its old columns stay.
- `src/server/tickets.ts` (pure, unit-tested): a ticket on one check is waiting (no run since it was
  attached), still failing (newest run did not pass; M of N), passing (newest passed once) or verified
  (the streak of passes reached two, flaky counts as not passed); a case recurred when it fails again
  after a ticket had reached verified; the project's tickets grouped by ticket into open, verified in
  the last 14 days and verified earlier.
- `src/server/queries.ts`: check page, case page and copied bug reports carry each case's tickets judged
  on that check (from the 50-run history); `caseLinks`, `runsByCase`, `recentRuns` and `project` exported.
- `src/server/ticket-links.ts`: attach (several cases or one problem), remove (a mistaken link), and the
  project view, which also lists cases failing in a check's newest full run that carry no ticket.
- `src/server/production-errors.ts`, `problems.ts`: a problem's tickets come from links (newest drives
  "since the ticket"); `decision` now only marks Not handling.
- Push API `POST /api/ping/:token/link` and client `link --cases ID,ID --ticket URL`: cases must be in
  the check's newest catalog; README and connect guide list it.
- UI (`src/components/tickets.tsx` and pages): check page Not passed — select cases and attach one
  ticket, Ticket column with the newest ticket's key, compact state and "Recurred"; case page — newest
  ticket with its verdict and the runs since, earlier tickets listed below; project Tests tab —
  "N failing cases without a ticket" and the tickets with their cases and per-check state; errors tab —
  Add ticket keeps earlier ones, the expanded row lists them with Remove.
- Copied bug reports list each case's tickets with their state and tell the agent to update the newest
  and to link back with the client (token from the environment only).
- Skill: `finoge-app/narrative-skills#40` (branch `ASSERT-37-cap7-ticket-links`), cap7 starts from the
  listed tickets and records every ticket with `link`; the skill's 31 tests pass. Not merged.
- Charter: engineering Structure and the derived-state decision; ui.md lists `tickets.tsx`.

## AC results

Ticket project `assert-37` (checks `dev`, `prod`) fed real NSDK dev result files (runs 61, 65, 66)
through the client: 65, tickets, 61, 66 on dev and 66 on prod, then 65 again, then 66 twice on each.
`assert-37-other` for refusals. Local 63037, built-in browser 1440×900 and 390×844.

1. One ticket on E2E-137 from its row; one ticket on E2E-151, 199 and 201 by selecting them; a second
   ticket on E2E-153 kept the first (both on the case page).
2. Case page: E2E-137 "Verified fixed" with runs #68 #69 passed; E2E-151 "Still failing: 5 of 5".
3. DEV and PROD share the tickets; PROD shows its own "Still failing 3/3" for E2E-151.
4. After run 65 again, E2E-137 and 153 show "Recurred after a verified fix" on Not passed; after two
   more passing runs the by-ticket view lists them under "Verified in the last 14 days".
5. Project Tests tab: "9 failing cases without a ticket" with their links; the open ticket lists its
   three cases with DEV and PROD states; verified ones folded.
6. Client link: linked; repeat reports "already linked"; wrong token 404; unknown case, a case from
   another project's check and an ftp URL 400; `psql` showed only the expected rows.
7. Both copies list "Tickets in AssertChecks, newest first" with each ticket's state (checked on the
   generated text).
8. cap7 text updated as above; the skill's tests pass. An agent run of cap7 is not part of this check.
9. The ASSERT-36-style single ticket inserted before migrating became the problem's first link; adding a
   second kept both, newest first, and "since the ticket" counts from the newest.
10. `/p/assert-37-other` is 404; view, attach and remove through that project return null/false and no
    link changed.

Mechanical defence: typecheck, 54 tests, build pass; antd lint 0 issues; no page-level horizontal scroll
at 390×844 on project, check and case pages.

## Deviations

- Client option `--cases` (as `start` uses) instead of the proposed `--case`.
- After the owner's-eye review: an untracked-cases notice, a stacked by-ticket list instead of a table,
  only the newest ticket is judged on the case page, ticket keys (ENG-123) in lists, fixed column widths
  on the Not passed tables.

## Environment

Port 63037 (`.claude/launch.json` in the main checkout, untracked). No env keys. Migration 007 applied
to the shared database.

## Residual

- Merge narrative-skills#40 and run `skillhost update` when this lands.
- A ticket URL whose key cannot be read (a Plane UUID link) shows the start of its ID.

## Check

1. http://127.0.0.1:63037/p/assert-37 — the "failing cases without a ticket" notice and the tickets
   list; whether this is the management view you want.
2. http://127.0.0.1:63037/p/assert-37/checks/dev — select cases and attach one ticket; the Ticket column.
3. http://127.0.0.1:63037/p/assert-37/checks/dev/cases/E2E-153 — newest ticket with its verdict,
   earlier ticket below.
4. http://127.0.0.1:63037/p/assert-37?tab=errors — a problem with two tickets (expand it).

Sign in as `assert-37+clerk_test@example.com` with code 424242.

## Decided for you

- Verified = the streak of passes since the ticket reached two runs; flaky counts as not passed.
- Recently fixed and Recurred live in the by-ticket view and on the Not passed row, not a new tab.
- A link can be removed only as a correction; tickets otherwise accumulate.
- Ticket states use each check's 50 newest runs.
- The API refuses case IDs absent from the check's newest catalog.
- Without a ping token, cap7 lists the link commands for a person.
- Lists show the ticket's key and a short state; the case page shows the full link and sentence.
