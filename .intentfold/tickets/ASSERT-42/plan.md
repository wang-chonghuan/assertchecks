# ASSERT-42 plan

## What the code already says

- Check page (`checks/$check/index.tsx`): breadcrumb plus a card titled with the check name; a "Run
  details" collapse duplicating the history's commit and deployed columns; "Before the checks" for a case
  that stopped before its first Then; the outside tab lists catalog cases outside the check's selection
  (drafts, on-demand), labelled "Not in this run"; group sections pass `showHeader` only to the first
  table.
- Case page: the error sits in a ghost Collapse ("Error output"); the tickets card states the status rule
  in a sentence; ticket links render in full.
- `tickets.tsx` `ticketLabel`: an issue key when the URL has one, else the URL's last segment (a UUID for
  Plane, shown as "7a890686…").
- `status.tsx`: check status Up/Failing/Late/New; run outcome Passed/Failed/Incomplete/Running.
- Production errors (`production-errors.tsx`): a one-line headline of four facts, a sentence on how
  failures are counted, groups triage (split now / not seen in 7 days), ticket, quiet (30+ days), ignored,
  noise; two stacked buttons per row; an "Appeared together" tag and detail row.
- `_app.tsx` header: brand link and a Home button both to the public homepage; the project page repeats
  the selected project's name as its title.
- Homepage: three questions in the cards and again in the diagram's AssertChecks box; two "Copy for your
  agent" buttons; "No SDK."; nothing on bugs/tickets or production errors.

## Route (by item)

1. Case page: when the case failed, its error shows inline under the Thens; the Collapse keeps only case
   details.
2. Errors rows: one "More" menu (Attach ticket / Not handling, or Add ticket / Undo) instead of two buttons.
3. Check page: drop "Run details"; the history's Run cell links the runner when there is one.
4. Header: no Home button; the brand goes to the projects (`/p`) when signed in.
5. `ticketLabel`: key when present; GitHub `repo#n`; otherwise the tracker's name ("Plane ticket", "Linear
   ticket", host otherwise). Every ticket link shows the label; the full URL is its tooltip.
6. "Stopped before A1" (the first Then's id).
7. Outside tab "Not in regular runs (N)".
8. Errors headline: three figures side by side — Needs a ticket, In progress, Failures in the last 24 h —
   each with a caption (new this week; still occurring; the day before).
9/10. Groups: "Needs a ticket (n)" = problems seen in the past 7 days or new; one fold "Not seen recently
   (n)" = untriaged problems not seen in 7 days plus every problem quiet for 30+ days; counts match rows.
11. Remove "Appeared together" from rows and details.
12. Errors use the tests' words: Needs a ticket, In progress, plus Not handling.
13. Check page: the breadcrumb is the page title (check name in heading2) with its status tag; the card has
   no title. Project page: no repeated project title.
14. Status tags only when the numbers do not say it: Late, New on checks; Incomplete, Running, Timed out on
   runs. Passed/failed runs show the tally alone.
15. Verify with a screenshot; fix if the header repeats.
16. Case page: status sentence becomes a tooltip on the status tag. Errors page: the counting rule becomes
   a tooltip on the 24 h figure.
17. Diagram box lines "Judges every run"; hero keeps Sign in, the connect section keeps the copy button.
18. Drop "No SDK.".
19. Homepage: a "What you see" section with two pillars: Bugs and their tickets; Production errors.
