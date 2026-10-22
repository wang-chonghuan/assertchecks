# ASSERT-39 acceptance checks

AC 1–5 by a tabletop run: a fresh agent with only the updated skill, in a scratch git repository whose
history has a product fix contained in the run's deployed commit, a product fix after it, and a test fix
contained in the run's test commit; its ticket list (a file standing in for the tracker) has one open
ticket, closed tickets with those fixes, and one closed as a duplicate with no fix; a report in
AssertChecks' format names one case for each situation plus one with no ticket. The agent is told it is
a dry run: write down every ticket write and AssertChecks link it would make, make none.

1. The case whose newest ticket is open: no new ticket, no write to that ticket.
2. The cases whose closed ticket's fix the run contains (product fix in the deployed commit; test fix in
   the test commit): one new ticket each that links the closed one, and a link back to AssertChecks.
3. The case whose closed ticket's fix the run does not contain: nothing.
4. The case whose ticket closed with no fix: no ticket; listed in the finish as undecidable.
5. The case with no ticket: a new ticket and a link back.

6. On the running product (port 63039, sandbox), the report `bugs --check dev` prints contains the
   short-form rule and no instruction to add evidence to, comment on or reopen an existing ticket.
