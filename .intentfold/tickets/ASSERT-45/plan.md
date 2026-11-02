# ASSERT-45 plan

## What the code already says

- The rules a repair needs exist, but apart: cap3 repairs scripts during a run and never weakens a
  Then; cap6 reserves catalog Thens for "the human" but only handles oracle findings; cap7 files
  tickets and changes nothing; SKILL.md's Shared State covers case-owned data and change-and-restore.
- `scripts/catalog-changes.mjs` already reports each case's changed fields in `modified[].fields`, plus
  `removed` and `deactivated`. The approval trigger needs no new script.
- "The human" is ambiguous here: in a developer's session the human is the developer, so approval needs
  a named owner. `assets/project/system-design.md` has no such section yet.
- cap7's Owners rule says not to guess an owner from who worked on something before. "Who introduced
  it fixes it" cannot go there; it belongs to whoever takes the ticket and compares the two runs.
- AssertChecks records each run's test commit and deployed versions, and shows them on the check page.

## Route

Skill repository (`finoge-app/narrative-skills`, same branch name):

1. New `assertchecks/references/cap8.md`.
2. `assertchecks/SKILL.md`: description, capability table, and the case owner in Project Contract.
3. `assets/project/system-design.md` and `references/cap0.md`: the case owner section and fact.
4. `references/cap7.md`: developers repair the filed tickets with cap8.
5. `agents/openai.yaml`: name cap8.

This repository: ticket records only. The deck's capability ring in `docs/` is not part of this ticket.
