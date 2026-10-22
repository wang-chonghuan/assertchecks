# ASSERT-39 plan

## What the code already says

- cap7 (`narrative-skills/assertchecks/references/cap7.md`) tells the agent to add evidence to the newest
  ticket of a case in progress, to comment on open tickets with the same cause, and for a closed ticket
  to compare the fix with the deployed version and then comment, reopen or file anew. It also opens
  with "Every case ends in a ticket", and its finish list reports tickets "created or updated".
- The report the agent reads lists each case's AssertChecks tickets newest first, but not their state in
  the tracker; the tracker state comes from the project's own ticket workflow, which cap7 already reads.
- A run records its test commit and each tested component's deployed commit; both are in the report.
- `src/lib/bug-report.ts` carries a short form of the same rules for an agent without the skill: "Add
  evidence to an open ticket…", "check a closed one … before reopening it", "A case in progress gets
  new evidence on its newest ticket".
- AssertChecks' own states (needs a ticket / in progress / fixed) are untouched by this ticket.

## Route

1. cap7: replace "Existing tickets first" with the newest-ticket rule — no ticket → file; newest open →
   leave it; newest closed → covered by this run (deployed version for a product fix, test commit for a
   test fix) → file a new ticket linking it, not covered → leave it; cannot tell → list it. Never write
   to an existing ticket. A case without a ticket whose cause an open ticket already covers is linked to
   that ticket without a comment.
2. cap7: "Every case ends in a ticket" becomes "every case ends linked to a ticket, left with its open
   or not-yet-deployed one, or listed as undecidable"; "created or updated" becomes "created or linked";
   the finish list gains the cases left alone and the undecidable ones.
3. `bug-report.ts`: rewrite the two short-form sentences to the same rule.
4. Skill tests and the AssertChecks mechanical defence.

No departures from the proposed solution.
