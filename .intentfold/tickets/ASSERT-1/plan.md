# ASSERT-1 plan

## What the code says that the ticket does not

- History currently appears in four places: the overview card's 30-run strip (`RunStrip`), the check
  page's case × run matrix and run-history table, the case page's history table, and links to the
  standalone run page `/p/$project/runs/$run` from all of them.
- The run page is the only place showing one run's detail (deployed SHAs, runner link, per-Then
  results, error excerpts). Removing history leaves it reachable only by typing an old run ID.
- The case page currently takes its Given/When/Then from the newest stored catalog that declares the
  case, which can be older than the latest run.
- Check state (`up/failing/late/new`) is already derived from the latest finished run only.
- A run can be `running` (started, not reported) and newer than the latest finished run.

## Route

1. `src/server/queries.ts`: overview cards keep status, latest run and next expected time, without the
   recent-run list. Replace `checkDetail` + `runDetail` with one query returning the check and its
   latest run (detail fields, summary, catalog-derived case titles). `caseDetail` reads the case spec
   and result from that same latest run only.
2. `src/lib/types.ts`: drop history and matrix view models.
3. Routes: overview card without strip; check page = latest run detail (summary, SHAs, runner link,
   case table with Then tags and expandable errors); case page = spec + latest result. Remove the
   run route and its links (per grill).
4. `src/components/status.tsx`: remove `RunStrip`, `Cell`, `caseTone`, `outcomeTone` when unused.
5. No schema or API change; all runs stay stored.

## Undecided

See `grill.md`.
