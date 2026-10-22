# ASSERT-39 rework

One round after the frozen handoff.

## Round 1 — a907152 (skill: narrative-skills 7f1a9f3)

Ask: "都以最新一次为准吧，别追溯前面很多次的run再合并了。我意思是，如果管理员run1一次，没开单，又run2了一次，就以最新的run2为准。如果run1开了一些单子，那么其产生的单子就需要修复。"

- The bug report is the check's latest full run with results: the cases that did not pass in it, each
  with its result, error, tickets and written expectation. The merge of the last ten runs and "did not
  pass in n of m" are gone. Button: "Copy bugs from the latest run"; the client's `bugs` prints the
  same text.
- cap7 files from that report alone: the "already fixed" exemption (proving a later commit changed the
  cause), the intermittent rule and "how often it did not pass" are removed. The report's short form
  says every case below ends with a ticket on it or listed for a person.
- Kept, as agreed: a bug counts as fixed after two passes in a row since its newest ticket.
- Rechecked: AC 6 on the ticket server — the sandbox dev report names run #84 and lists 16 cases, the
  same count the database gives for #84; E2E-179, failing only in the earlier #77, is gone; no
  "Did not pass in", "recent full runs", "Add evidence" or "reopening". Typecheck, 60 tests, build.

Net effect against the handoff: AC 1–5 unchanged (the existing-ticket table is untouched); Check 1 of
the handoff is resolved by this round.
