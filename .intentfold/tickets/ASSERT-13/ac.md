# ASSERT-13 acceptance checks

Platform change here (port 63013); skill change in `finoge-app/narrative-skills`, worktree
`/Users/yong/.skillhost/user_repos/narrative-skills--ASSERT-13`, branch `ASSERT-13-group-tags` from
`80874bb3861a4fd27f0426ab34fbe916345b2fba`. All data is a ticket-scoped project, check and user, removed with the CLI afterwards. No
NSDK or other project file is touched.

## AC1 Old and new catalogs are valid

Check: the official client's `check` against the preview with a minimal catalog without group/tags,
the same catalog with group/tags, and one with `"group": ""`.
True when: the first two print "valid"; the third is invalid and names `catalog.cases[…].group`.

## AC2 Fields are stored, read, grouped, shown and filterable

Check: report a full run whose catalog spreads cases over two groups and leaves one ungrouped, with
tags such as `"smoke, permissions,smoke,"`; open the check page as the throwaway member; use the
group and tag filters.
True when: cases appear under their group headings (ungrouped last), tags show split, trimmed and
de-duplicated, and each filter leaves only matching cases. The case page shows the group and tags;
the stored catalog still holds `tags` as the original string and any project field.

## AC3 One appearance per case; judgement and totals unchanged

Check: count each case's rows per tab; compare the outcome and summary counts with a run of the same
results and a catalog without group/tags, and before and after filtering.
True when: each case appears once per tab; the outcome and the summary card's counts are identical.

## AC4 cap1 tells organizing changes from test changes

Check: `node --test` of the helper with cases changing only group/tags, group/tags plus `then`, a new
case and a missing script.
True when: the group/tags-only case is listed in `organizingOnly` and not in `generate`, while the
others are in `generate`; `modified` still reports every change.
