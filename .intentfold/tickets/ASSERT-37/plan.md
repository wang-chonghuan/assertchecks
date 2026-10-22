# ASSERT-37 plan: tickets on failing cases and production errors

## What the code says that the ticket does not

- A check page already reads its 50 newest runs with each case's slim result (`recentRuns`), which is
  enough to judge every ticket of a case on that check; no extra run query is needed there.
- "Not passed" is the latest run's view, so a fixed case leaves it by itself. "Recently fixed" and
  "Recurred" therefore live in the by-ticket view and as a tag on the Not passed row.
- Error problems hold one `ticket_url` with `decision = 'ticket'`; production has 59 problems and none
  decided, so moving to links loses nothing. The old columns stay (additive migrations) and the new
  code ignores `decision = 'ticket'`.
- The ping token for a check is, by the skill's cap0, a CI secret and a local environment variable,
  so cap7 run locally has it; when it does not, cap7 lists the link commands for the human.
- The client already takes `--cases ID,ID` for `start`; `link` reuses that option instead of the
  ticket's suggested `--case`.

## Route

1. Migration `007_ticket_links.sql`: `ticket_links` (project, case ID or error problem, URL, who,
   when; unique per subject and URL); copy existing error tickets into it.
2. `src/server/tickets.ts` (pure, unit-tested): a ticket's status on one check from the case's results
   since it was attached — waiting (no run since), failing (newest result not passed; failed M of N),
   passing (newest passed, not yet twice), verified (two newest results since attachment passed, with
   the time verified); a case recurred when it fails now after a ticket reached verified.
3. Server: link reads and writes scoped by membership (`attachTicket`, `removeTicket` server functions);
   `checkDetail`, `caseDetail` and `bugReport` carry each case's tickets and statuses; a project
   ticket summary for the by-ticket view; push API `link` (check token; cases must exist in the
   check's newest catalog).
4. Client `link --cases ID,ID --ticket URL`; README and connect guide list the new call.
5. UI: check page Not passed — select cases, attach one ticket; Ticket column with the newest ticket,
   its status and "Recurred"; case page Tickets card with every ticket, newest first, its status and
   results since; project Tests tab "Tickets" card grouped by ticket with open / verified in the last
   14 days / earlier; errors tab adds tickets instead of replacing and lists them all.
6. Copied bug reports list each case's tickets and tell the agent to add evidence to an open one and
   to link new or updated tickets back.
7. Skill (narrative-skills worktree `narrative-skills--ASSERT-37`): cap7 reads the listed tickets
   first and links tickets back with the client.
