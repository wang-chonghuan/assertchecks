# ASSERT-13 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit. No NSDK or other connected-project file was changed.

## What changed

**Platform** (this repository):

- **Format** (`public/schemas/catalog.schema.json`): two new optional case properties, with
  `version` still 1.
  - `group`: non-empty text, one per case, named freely.
  - `tags`: a single comma-separated string.

  Each description says the field only organizes and filters. Old catalogs stay valid, and project
  fields are still kept.
- **Receive and store**: no change needed. The server validates against the schema (an empty
  `group` or a non-string `tags` names the field), judgement ignores both fields, and the catalog is
  stored as uploaded, so `tags` stays the original string. The client already uploads the catalog
  unchanged.
- **Read** (`src/lib/organize.ts`, `src/server/queries.ts`):
  - `tagList` splits on commas, trims, and drops empty and repeated labels.
  - `caseMeta` gives `{ group | null, tags[] }`.
  - `groupOrder` sorts alphabetically, with Ungrouped last.
  - The check detail now carries `caseMeta` for every case in the latest full run's catalog.
- **Check page**:
  - Every tab (Failed, Passed, Draft, Manual, All) lists its cases in group sections, each with a
    heading and count. Each case appears once, in its one group.
  - A catalog with no groups keeps the single plain table, and the filters appear only when some
    case has a group or tags.
  - A Tags column shows the parsed tags, and the leading columns have fixed widths so sections line
    up.
  - "All groups" and "All tags" selects filter by one group (Ungrouped included) or one tag. When
    a filter is active, a note says "Showing N of M cases. The run's outcome and counts above cover
    every case."
  - The summary card is never filtered.
- **Case page**: Group (or Ungrouped) and Tags rows.
- **Docs**: the README catalog paragraph, and the connection guide's step 2 text and `e2e.json`
  example (so "Copy for your agent" carries it too).
- **Tests**: `tests/organize.test.ts` (2) and a group/tags schema test; 38 tests in total.

**Skill** (`finoge-app/narrative-skills`, branch `ASSERT-13-group-tags`, commit `08e1918`, base
`80874bb`):

- `SKILL.md`, The AssertChecks Format: what `group` and `tags` mean. The project decides how to
  classify, and `tags` stays a string. Neither field selects, permits, asserts or judges anything,
  and test code must not read them.
- `scripts/catalog-changes.mjs`:
  - `modified` still reports `group`/`tags` changes.
  - A new list, `organizingOnly`, holds cases whose only changed fields are `group` and/or `tags`.
    Those are left out of `generate` unless their script is missing.
  - Other modifications, new cases and missing scripts still generate, and deactivation follows its
    existing rule.
- `references/cap1.md`: the output description, plus a row for organizing-only changes: commit
  alone, with no spec sync, data review or re-execution; a missing script is still generated.
- `references/cap2.md`: a group or tag is not a selection. Resolve it to explicit case IDs the human
  confirms.
- `tests/catalog-changes.test.mjs`: one new test; 32 in total.

## AC results

Preview on port 63013. The tests used a throwaway project `assert-13-test` with checks `plain` and
`grouped` and member `assert-13-tester@example.test`. These were removed with
`pnpm admin project:remove` / `user:remove`: 2 checks, 2 runs and 1 membership. The data is back to
the owner account and projects nsdk and bf.

1. **Old and new catalogs valid — passed.** With the official client from the preview,
   `check --catalog` printed "valid" for the plain 5-case catalog and for the same catalog with
   `group`/`tags`. A catalog with `"group": ""` printed
   `format error: catalog.cases[0].group: must not be empty` and exited 1.
2. **Stored, read, grouped, shown, filtered — passed.** The same results were reported to both
   checks, with E2E-002 failed on A1. The grouped catalog had Sign-in (001, 002), Billing (003, draft
   005) and ungrouped 004; 002's tags were `" smoke, permissions,smoke,"`, plus a project field
   `owner` on every case.
   - In the database, the stored `tags` is the original string (`jsonb` type string), and `owner`
     is kept.
   - The All tab shows "Billing 2", "Sign-in 2" and "Ungrouped 1", in that order. E2E-002 shows tags
     "smoke, permissions", and Failed lists only "Sign-in 1" with E2E-002 and A1 failed.
   - The Billing filter leaves 003 and 005 (All 2). Clearing it restores 5.
   - The "smoke" tag filter leaves 005, 001 and 002 (All 3).
   - The case page shows "Group Sign-in Tags smoke permissions".
   - The plain check shows no filters and one plain table. The screenshot is `grouped-all.png`.
3. **Once per case; judgement and totals unchanged — passed.** Each tab lists every case once (All:
   5 rows for 5 cases). Both checks judged the run `failed` ("E2E-002 failed"). The summary card is
   identical for both checks and under both filters: Total 5, Passed 3, Failed 1, Draft 1, Manual 0.
4. **cap1 distinguishes organizing changes — passed.** The new helper test:
   - E2E-001 (only group/tags) → `organizingOnly`, not in `generate`.
   - E2E-002 (group and `then`) → `generate`.
   - E2E-003 (tags and status → draft) → `deactivated`, not generated, by the existing rule.
   - E2E-004 (only tags, no script) → `organizingOnly`, and still in `generate` through
     `missingScripts`.
   - New E2E-005 → `generate`.
   - `modified` lists all four changes.

   On NSDK with base `1e8fde255`, the new helper's output equals the current one's except for an
   added empty `organizingOnly`; NSDK's working tree was untouched.

At 390 px wide the grouped check page has no horizontal page scroll. Mechanical defence:
typecheck, 38 unit tests and build passed. ips-antdesign lint found 0 issues. The skill's helper
tests passed 32 of 32.

## Deviations

- Filters are shown only when some case has a group or tags, so old catalogs look exactly as before.
- Leading table columns got fixed widths so group sections align; this was not asked for, but
  without it each section sized its own columns.

## Environment

Web port 63013. No env keys and no migrations.

## Residual

Classifying NSDK's cases is a separate business migration, as the request says.
