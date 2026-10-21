# ASSERT-35 handoff

At the owner's request, the assertchecks skill gained cap7 in finoge-app/narrative-skills#34: file
bug tickets from the failures report AssertChecks copies, with the project's own ticket workflow.

It encodes the rules settled while filing the 2026-10-21 NSDK batch by hand:

- Every case ends in a ticket, unless the run's own evidence shows it already fixed.
- Product defects (one ticket per cause), test defects (fix tickets for the tests) and open
  questions (product versus test unclear, or a rule and the product disagree) all get fix tickets;
  an open question states the evidence for each reading for its owner to investigate.
- An open ticket covering the cause gets the new evidence instead of a duplicate; a closed one is
  checked against the failing run's deployed version before reopening.
- Links use AssertChecks' public origin; owners come from the project's rules or the human.

cap0–cap6 keep their numbers; cap0 now says cap1–cap7 do the ongoing work. The copied report
(ASSERT-34) points the agent at cap7. The skill's 31 tests pass and `skillhost update` installed it.
