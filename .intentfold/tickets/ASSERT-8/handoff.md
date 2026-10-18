# ASSERT-8 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

- **Published format** (`public/schemas/catalog.schema.json`, `public/schemas/result.schema.json`):
  JSON Schema 2020-12, served at `/schemas/…`.
  - Catalog core fields: `version: 1`; `cases[]` with `id`, `title`, `status` (active / draft /
    retired), `run` (nightly / manual), `given`, `when`, `then[]` of `{id, expect}`, and an optional
    `failure`. Projects may add their own fields.
  - Result: the existing envelope, as Playwright (`report.suites` required, report otherwise
    unchanged) or strict cases.
- **One definition** (`src/server/schema.ts`): the server imports those same files and validates with
  a small validator for the keywords they use. No dependency was added. It also checks unique case
  IDs and unique Then IDs per case. Errors name the field path; at most 10 are reported.
- **Report ingestion** (`src/server/ingest.ts`): a catalog or result that does not match is recorded
  as `incomplete`, with reason "Report does not match the AssertChecks format: …". The reply carries
  `errors`. Runs are still recorded, so a broken producer shows up rather than going Late.
- **Dry run**: `POST /api/ping/:token/check` (`src/routes/api/ping/$token/check.ts`,
  `checkReport`). It validates the catalog, plus the result when given, and judges against the
  check's selection with versions skipped (new `skipVersions` option in `judge`). It writes nothing.
- **Client** (`public/client/assertchecks.mjs`):
  - New `check --catalog … [--playwright … --exit-code N] [--cases …]`, exiting 1 when invalid.
  - `report` prints `format error:` lines and exits 1 when the server names format errors.
- **Homepage** "Report format" section: titled "One fixed format, checked on arrival", with Catalog
  format / Result format links, a fourth "Would this pass?" dry-run card, and the dry-run command.
  Step 2 of "Connect" mentions the dry run.
- README push-API table and format paragraph updated.
- Tests: `tests/schema.test.ts` (5) and three client tests; 29 in total.

## AC results

Preview on port 63008 against the shared database. AC2 used a throwaway project and check
(`ac8-temp/dry`), removed afterwards together with its one run.

1. **Both formats published — passed.** `/schemas/catalog.schema.json` and `/schemas/result.schema.json`
   return JSON Schema documents (`$schema` 2020-12, `$id`, `type: object`). The served catalog file
   is byte-identical to `public/schemas/catalog.schema.json`, which `src/server/schema.ts` imports.
2. **Wrong fields named, nothing recorded — passed.** A dry run of a catalog with `status: "enabled"`
   and a Then without `expect` printed
   `catalog.cases[0].status: must be one of "active", "draft", "retired"` and
   `catalog.cases[0].then[0]: missing expect`, then "invalid; nothing was recorded", exit 1. The
   check's run count was 0 before and after. Reporting the same catalog for real recorded run 33 as
   `incomplete` with those two fields in the reason, and the client exited 1.
3. **NSDK still passes — passed.**
   - With the NSDK DEV token, the current NSDK catalog (`4bbc4a2f5`) dry-ran valid. Adding DEV run
     30's stored Playwright report gave "would be failed (E2E-094 failed)", the same as run 30's stored
     outcome. NSDK's run count stayed 5.
   - Re-judging all 5 stored NSDK runs with the new validation reproduced 4 stored outcomes. The fifth,
     run 10 (2026-10-16), was uploaded as a raw Playwright report before the envelope existed;
     current `main` already judges that body incomplete, so this is not a change.
   - The next nightly DEV report after deployment is to be confirmed at close.
4. **Homepage links the formats — passed.** The format section links `/schemas/catalog.schema.json`
   and `/schemas/result.schema.json` and shows
   `node assertchecks.mjs check --catalog e2e.json --playwright results.json --exit-code "$code"`. At
   390 px wide nothing extends past the viewport.

Mechanical defence: typecheck, 29 unit tests and build passed. ips-antdesign lint found 0 issues.

## Deviations

- Format errors on a real report are recorded as an `incomplete` run (HTTP 200 with `errors`), not
  rejected with 400. A rejected report would leave the run `running` until it timed out, hiding the
  cause.
- `type: object` was added at the top of the result schema so both documents declare their type.

## Environment

Web port 63008. No env keys and no migrations.

## Residual

None for this ticket. ASSERT-10 makes the skill use `check`.
