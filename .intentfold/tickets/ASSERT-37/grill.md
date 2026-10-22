# ASSERT-37 grill

No question passed the bar: the owner approved the design and its five decisions on 10-22.

## Decided for you

1. "Verified fixed" — the two newest runs of that check that included the case, both after the ticket
   was attached, passed (flaky counts as not passed). Named-case runs count. Basis: cap7's acceptance
   line; the ticket's proposed solution.
2. "Recently fixed" and "Recurred" live in the project's by-ticket view, with "Recurred" also on the
   check page's Not passed row. Basis: Not passed is the latest run's view and already drops a fixed
   case; a separate tab would duplicate Passed.
3. A ticket link can be removed (for a wrong paste); otherwise links are never replaced.
   Basis: the errors tab already lets a decision be undone.
4. Ticket statuses use the check's 50 newest runs (the history window).
5. The client option is `--cases` like `start`; the API rejects case IDs absent from the check's newest
   catalog, so a typo cannot create a link to nothing.
6. When cap7 has no ping token for the check, it lists the exact link commands for the human.
7. The errors tab keeps "Not handling"; tickets on errors become a list like on cases.
