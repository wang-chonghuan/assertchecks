# ASSERT-33 plan: content design of the check card and detail pages

Display only. No change to server functions, queries, judge, schema or the types they return.

## Job story

When I open a project or a check after a run, I want to see how many cases ran and how many
failed, and which ones and why, so I can decide what to fix or report.
Evidence: the owner's words on 2026-10-20 — "我想知道这次实际跑了多少，有多少bug。我不关心有几个草稿，
有几个手动的", and "这个卡令人费解".

## The question each view answers

- Card: did the latest run pass, and if not, how many of the cases that ran failed?
- Check page: which cases failed in that run, and why?
- Case page: did this case pass in that run, and if not, why?

## Priority guide — card (project page, check page header, homepage example)

| # | Element | Why | Form |
|---|---|---|---|
| 1 | Status tag (Up / Failing / Late / New) | the verdict | tag, card header |
| 2 | Failed count, or "All passed" | answers the question | one large number + label |
| 3 | Cases that ran | the denominator the owner asked for | "of N run" beside it |
| 4 | Passed / failed / did-not-finish split | shape at a glance | bar of ran cases only, legend for what the headline does not already say |
| 5 | When it ran | is the result current | one small line |
| 6 | Run in progress | the result is about to change | one small line |
| 7 | Incomplete reason | why there is no result | short warning |

Moved behind an info popover on the "Ran …" line: trigger (scheduled/manual), schedule and next
run, newer partial run, and catalog makeup (total, draft, manual — cases outside this run).
Catalog changes: one warning line on the card, full list in a collapse on the check page.
Cut: "200 cases", draft and manual segments of the bar and legend.

## Priority guide — check page

1. Header card: the card above, then a collapsed "Run details" (versions, exit code, runner link,
   catalog changes, partial run).
2. Cases: tabs Failed / Passed / Not in this run. "Not in this run" merges draft and manual with a
   reason tag. The All tab is cut (it repeats the other three).
3. Failed rows: case ID and title (with a status tag only when it is not plain Failed), the Thens
   that did not pass, the first line of the error; the full error stays in a collapsed row.
Cut: Tags and Duration columns (tags remain as a filter and on the case page), the long filter
note ("The run's outcome and counts above cover every case") → "Showing X of Y".

## Priority guide — case page

1. Result first: this case's status in the latest run, with the run time.
2. The investigated cause (`failure` in the catalog), when present.
3. Then / Given / When with each Then's status.
4. The error output in a collapse.
5. Group, tags, type, run policy and status in a small collapsed "Details".

## How to test

Deletion and first-screen tests on each view, at 1440×900 and 390×844, with real NSDK run 56/57
result files reported to a ticket-scoped project.
