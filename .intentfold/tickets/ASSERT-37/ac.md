# ASSERT-37 acceptance

Data: ticket-scoped project `assert-37` with two checks, `dev` and `prod`, fed NSDK's real result
files through the client so each has several full runs with failing and passing cases; a second
project `assert-37-other` the test user is not a member of. Errors: the ticket project points at the
BF workspace read-only. User `assert-37+clerk_test@example.com` (code 424242). Local server 63037;
built-in browser at 1440×900 and 390×844. Nothing is written to `bf` or `nsdk`.

1. Check page Not passed: attach a ticket to one case; select three cases and attach one ticket to all;
   attach a second ticket to a case — both stay.
2. Case page: every ticket newest first with who/when, the results since, and "Still failing (M of
   N runs)" or "Verified fixed (2 runs in a row)". Ticket attached before runs where the case later
   passed twice shows Verified; one after a failing run shows Still failing.
3. `dev` and `prod` share the tickets of a case; each check page shows its own status.
4. By-ticket view shows verified tickets under "Verified in the last 14 days"; a case that later fails
   shows "Recurred" on the Not passed row with its earlier tickets.
5. Project Tests tab "Tickets" card: each ticket with its cases and their per-check status.
6. `node assertchecks.mjs link --cases … --ticket …` with the check's token: the page shows the links
   at once; a wrong token, an unknown case and another project's case are refused, nothing changes
   (`psql`).
7. Copy bugs from recent runs and the case copy list each case's tickets.
8. The skill's cap7 tells the agent to update the listed ticket and to link back with the client;
   the skill's own tests pass.
9. Errors tab: two tickets on one problem stay, newest drives "since the ticket"; an existing
   single-ticket decision is carried over by the migration (checked by inserting one on the ticket
   project before migrating).
10. Non-member: 404 on pages; server functions and the API refuse writes for that project.

Always: `pnpm typecheck && pnpm test && pnpm build`, antd lint, no page-level horizontal scroll at
390×844.
