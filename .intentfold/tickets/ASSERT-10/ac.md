# ASSERT-10 acceptance checks

The skill change lives in `finoge-app/narrative-skills`, worktree
`/Users/yong/.skillhost/user_repos/narrative-skills--ASSERT-10`, branch
`ASSERT-10-assertchecks-generic` from `ecff84d`. This ticket's records live here.

## AC1 No NSDK-specific rules remain in the skill

Check: search the skill's `SKILL.md`, `references/`, `agents/` and templates for NSDK-only terms
(NSDK, Narrative, CIAM, 1006, mailbox, ENG-, onboarding, Fake Bank, Airflow, dev.narrativebanking,
vm-nsdk, assertchecks-nsdk, xvfb).
True when: none are found; project rules are reached through the project's own `assertchecks/`
documents instead.

## AC2 A new project goes from scaffold to a result in AssertChecks without AssertChecks changes

Check: in a temporary Git repository in the scratchpad, follow cap0 → write two cases → cap1 →
cap2 → cap3 exactly as the skill says, against the ASSERT-8 preview (port 63008) and a throwaway
project and check. The product under test is a minimal static site inside that repository, served
locally and exposing `version.json` with its Git SHA (AssertChecks only passes runs whose tested
versions were recorded).
True when: the dry run is valid, the report is accepted with outcome `passed`, the check page shows
both cases and their Then results to a throwaway member, and no AssertChecks code was changed for
it. The throwaway project, check, user and repository are removed afterwards.

## AC3 Codex has a complete NSDK brief

Check: compare the content removed from the skill with the brief.
True when: every removed NSDK rule is either already in NSDK's `assertchecks/` documents or named
in the brief, and the brief also asks NSDK to dry-run its catalog with `check`.

## AC4 Existing skill helper still works

Check: `node --test assertchecks/tests/catalog-changes.test.mjs` in the skill worktree, and the
helper against the NSDK repo with the ENG-1638 base.
True when: the tests pass and the NSDK result is unchanged from the current skill's.
