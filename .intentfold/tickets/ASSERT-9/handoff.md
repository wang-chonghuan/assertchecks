# ASSERT-9 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

- `src/server/catalog-changes.ts` (new, pure): `catalogChanges(previous, latest, selection)`.
  - It lists the cases the check's selection required in the previous full run's catalog that the
    latest full run's catalog either removed (`removed`) or moved out of the selection (`moved`).
  - For a `moved` case it names only the field that left the selection: its new `status` (for example
    draft or retired) and/or its new `run` (manual).
  - Additions, promotions and text edits are not reported. A latest run without a catalog (a reported
    error) is not compared.
- `src/server/queries.ts`: `previousCatalog` reads the catalog of the full run before the latest one,
  skipping runs without a catalog. Named-case (partial) runs are never compared. `CheckCard` gains
  `catalogChanges` (`src/lib/types.ts`).
- `src/components/check-summary.tsx`: a yellow notice, "Catalog changed: N required case(s) no longer
  in the run", lists each case as "removed from the catalog", "now draft" or "now manual".
  - It appears on both the project card (at most 3, then "and N more on the check page") and the
    check page (all, plus "Compared with the previous full run. The latest run is judged as
    reported.").
  - It sits above the existing run notices.
- The homepage example card has the new field set to empty.
- `tests/catalog-changes.test.ts`: 5 tests; 34 in total.

The notice is derived on read. It shows until the next full run, which becomes the new comparison
point. Judgement, ingestion and status are untouched.

## AC results

Preview on port 63009. The checks used a throwaway project `ac9-temp`, a scheduled check `nightly`
and member `ac9-tester@example.test`, all removed afterwards with runs 36–39. The database again
holds only support@, projects nsdk and bf, and 5 runs. Runs were reported through the real
`start`/`report` API in the cases format.

1. **Removed required case — passed.** Run 36 had E2E-001..004, all active nightly. Run 37 had a
   catalog without E2E-002. The project card and the check page both showed "Catalog changed: 3
   required cases no longer in the run" with "E2E-002 Case E2E-002 — removed from the catalog".
2. **Moved cases named with their new state — passed.** In run 37, E2E-003 became draft and E2E-004
   became active manual. The notice listed "E2E-003 … — now draft" and "E2E-004 … — now manual".
   The screenshot is `after-run2-project.png` in this ticket directory.
3. **No notice without a reduction, judgement unchanged — passed.**
   - A partial run (38, `cases: ["E2E-004"]`) after run 37 left the notice as it was.
   - Run 39, with the same catalog as run 37, showed no notice on either page.
   - Runs 36–39 were all `passed`, as their results give.
   - NSDK's real data (DEV run 30 promoted E2E-094) shows no notice on any NSDK card.

Mechanical defence: typecheck, 34 unit tests and build passed. ips-antdesign lint found 0 issues.

## Deviations

None from the ticket. The proposed solution was empty.

## Environment

Web port 63009. No env keys and no migrations.

## Residual

None.
