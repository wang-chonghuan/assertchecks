# ASSERT-10 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

In `finoge-app/narrative-skills`, branch `ASSERT-10-assertchecks-generic` (commit `288943e`, base
`ecff84d`):

- `assertchecks/SKILL.md` is now generic.
  - Description and capability table add cap0.
  - New "The AssertChecks Format" section points to the published catalog format; the dry run is
    the authority, and no copied schema is allowed.
  - "Project Contract" makes `assertchecks/system-design.md` own every project-specific rule and
    says to stop and ask when it is silent.
  - Test Implementation and Final-Code Data Review keep their rules without NSDK names: CIAM, 1006,
    mailbox, ENG-1611, onboarding and Journey are gone.
- `references/cap0.md` (new) connects a project:
  1. gather facts (environments, sign-in, data, version URLs, runner);
  2. scaffold `assertchecks/` from `assets/project/` (`playwright.config.ts`, `config.json`,
     `system-design.md`) and the CI workflow from `assets/workflow/assertchecks.yml`;
  3. hand the check and token creation to an operator;
  4. author the first cases with cap1, dry-run them, then run cap2 and cap3.

  It never invents cases.
- `references/cap1.md` writes the catalog in the AssertChecks format and generalizes the provider
  passages. The helper takes `--schema` with the fetched published format when the project has no
  schema of its own. The changed catalog is dry-run before commit.
- `references/cap2.md` drops the NSDK account, mailbox, Airflow, Fake Bank and
  `ASSERTCHECKS_ALLOW_SHARED_RUN` specifics in favor of "the switches system-design.md names".
- `references/cap3.md` adds a "Dry Run" section, lists version URLs as a prerequisite from
  `system-design.md`, prints format errors, and replaces "NSDK Runners" with "Scheduled Runs".
- `scripts/catalog-changes.mjs` adds the `--schema` option and a clear error when neither schema
  exists. The test suite gains one test, for 31 in total.
- `agents/openai.yaml` has generic descriptions.

In this repository: the ticket records and `nsdk-brief.md`, the brief for Codex.

## AC results

1. **No NSDK-specific rules remain — passed.** A case-insensitive search of `SKILL.md`,
   `references/`, `agents/` and `assets/` for NSDK, Narrative, CIAM, 1006, mailbox, ENG-<n>,
   onboarding, Fake Bank, Airflow, dev.narrativebanking, vm-nsdk, assertchecks-nsdk and xvfb found
   nothing.
2. **Scaffold to result without AssertChecks changes — passed, after one ASSERT-8 fix.**
   - Setup: a temporary repository in the scratchpad with a two-file static "Sample Shop" served on
     port 63110, whose `version.json` carries its Git SHA. It was run against the ASSERT-8 preview
     (63008) with the throwaway project `ac10-shop`, check `local` (manual only) and member
     `ac10-tester@example.test`.
   - cap0: the templates filled every placeholder with no leftover `<…>`.
   - cap1: the helper with `--schema` (fetched from `/schemas/catalog.schema.json`) reported
     E2E-001 and E2E-002 as added and to generate, and they were written. The dry run printed "valid";
     native `--list` collected both.
   - cap2/cap3: running `start` → test command → `report` exactly as cap3 writes them gave
     test exit 0 and "AssertChecks run 35: passed"; an earlier run, 34, also passed.
   - The member's project card and check page showed 2/2 passed. The case page for E2E-001 showed
     Given/When and "A1 · Passed", "A2 · Passed".
   - The case page first crashed ("reading 'toUpperCase'") because it required NSDK's own `type`
     field. The fix went onto the unmerged ASSERT-8 branch as commit `7952aff` (the tag shows only
     when present), since ASSERT-8 is the ticket whose published format makes `type` a project
     field. NSDK's case page still shows its "UI" tag.
   - All throwaway data was removed: runs 34–35, the check, the membership, the user and the
     project. The database again holds only the owner account, projects nsdk and bf, and 5 runs.
3. **Complete NSDK brief — passed.** Every NSDK-specific line removed from the skill (from
   `git diff`) is either already in NSDK's `system-design.md` or named in `nsdk-brief.md`'s eight
   items: authentication, one-time codes, environments, the run-permission switch, onboarding
   scope, tested versions, runner, and recording/data classification. The brief also asks for a
   `check` dry run of NSDK's catalog.
4. **Helper unchanged for NSDK — passed.** `node --test assertchecks/tests/catalog-changes.test.mjs`
   passed 31 of 31. Against NSDK with base `1e8fde255`, the current and new helpers produced
   byte-identical output (E2E-094 modified: status).

## Deviations

- The acceptance product under test is a temporary static site rather than the AssertChecks
  homepage. AssertChecks passes only runs with recorded versions, and the homepage has no version
  endpoint (`ac.md` was updated before development).
- ASSERT-10 depends on ASSERT-8 being merged and deployed: cap1 and cap3 use `check` and
  `/schemas/`.

## Environment

No ports in the product; the sample site used 63110 temporarily. No env keys.

## Residual

- Codex applies `nsdk-brief.md` in NSDK after ASSERT-8 and this skill change are merged.
- The workflow template assumes a deployed product. A project that must start its product inside
  CI adds that step itself.
