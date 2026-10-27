# ASSERT-42 handoff

## What changed

- Check page (`checks/$check/index.tsx`): one title "Project / Check" with its status and the CI run link;
  no "Run details"; "Stopped before A1"; tab "Not in regular runs (N)"; history shows outcome tags only for
  incomplete, running or timed out and colours a failed tally; the Deployed column appears only when a run
  recorded versions; the "same cause" note is a tooltip; on phones the copy button sits above the tabs.
- Case page: the error shows inline under the Thens; the status rule is a tooltip on the status tag.
- `components/tickets.tsx`: tickets read as their key, `repo#n`, or the tracker ("Plane ticket"), full link
  on hover, everywhere.
- `components/status.tsx`: Up and Failing tags are not shown (the counts say it); Late and New are.
- Header: no Home button; the brand opens the projects. Project page: no repeated project title.
- Production errors: three labelled figures (Needs a ticket, In progress, Failures in the last 24 h with
  the counting rule as a tooltip); groups Needs a ticket / In progress / one fold "Not seen recently" /
  Not handling / Filtered noise; one ⋮ menu per row; no "Appeared together"; empty groups say so in a line.
- Homepage: hero without the copy button; diagram box "Judges every run against your catalog"; no
  "No SDK."; new section "What you see" on bugs with tickets and production errors.

## AC results

Port 63042, signed in as the sandbox account, 1440×900 and 390×844.
1. Pass. E2E-094: the error text is visible on load.
2. Pass. Each row shows one ⋮ menu; it lists Attach ticket and Not handling; Attach ticket opened the
   dialog without expanding the row; cancelled, nothing saved.
3. Pass. No Run details; test commit in the history only (deployed too when recorded).
4. Pass. Header links: brand → /p, Sign out; no Home.
5. Pass. Bugs list, check page and case page all show "Plane ticket" for the sandbox link; tooltip holds the URL.
6. Pass. "Stopped before A1" on the cases that never reached a Then.
7. Pass. Tab reads "Not in regular runs (40)".
8. Pass. Three separate figures with labels.
9. Pass. "Needs a ticket (6)" → 6 rows; "In progress (0)" → its empty line.
10. Pass. One time fold, "Not seen recently (25)".
11. Pass. No "Appeared together" on the page.
12. Pass. Needs a ticket / In progress / Not handling on both views.
13. Pass. "Sandbox / DEV" once on the check page; the project page has no repeated title.
14. Pass. No Failing/Up tags; history tags only for incomplete, running, timed out.
15. Pass — and this item was my audit's mistake: the failed table already showed one visible header; the
    repeats came from hidden measuring rows the text extractor read.
16. Pass. Neither sentence is on the pages; both are tooltips.
17. Pass. Three questions once; one "Copy for your agent".
18. Pass. No "No SDK.".
19. Pass. "Bugs and their tickets" and "Production errors" on the homepage.
No horizontal page scroll at 390 px. Mechanical defence: typecheck, 61 tests, check:infui, build — pass.

## Deviations

- Item 3: the runner link moved to the page title (the history rows carry no runner link); exit code is no
  longer shown (an incomplete run's reason already says why).
- Added after a fresh-eyes review: Deployed column hidden when nothing was recorded, empty groups as a
  line, figures in one row on phones, the copy button above the tabs on phones.

## Environment

Port 63042. No env keys, no migration.

## Residual

None.

## Check

1. http://localhost:63042/p/sandbox?tab=errors — the three figures, the row ⋮ menu and the group names.
2. http://localhost:63042/p/sandbox/checks/dev — the one title, the history without status tags, "Stopped
   before A1", "Not in regular runs".
3. http://localhost:63042/ — the new "What you see" section and the hero without the copy button.
4. Still there, raised by the fresh-eyes review and not changed: each errors row has the ⋮ menu plus the
   expand "+"; on phones the third tab name is cut ("Not in regu…"); the small kicker above each section
   title ("HOW IT WORKS") repeats what the title says.

## Decided for you

- Errors use the tests' words; there is no "Fixed" for errors (AssertChecks never claims an error solved).
- One ⋮ menu per row instead of two buttons.
- "Not seen recently" folds untriaged problems quiet for 7+ days with every problem quiet for 30+ days.
- Plane links read "Plane ticket" because the link carries no key.
- Status tags only where the numbers do not already say it.
- Homepage section "What you see" with two cards.
