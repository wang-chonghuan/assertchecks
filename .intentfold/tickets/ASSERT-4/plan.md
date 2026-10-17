# ASSERT-4 plan

## What the skill says that the ticket does not

- The skill (`narrative-skills/assertchecks`) has cap1 (generate/sync) and cap2 (run); cap2 states
  that invocation does not authorize scheduling, which remains true.
- The client, its commands and the push contract are defined by ASSERT-2; cap3 must describe them,
  not restate the judgement rules in detail.
- NSDK's runners (ASSERT-3) have no sudo, which changes how a workflow prepares Playwright.

## Route

1. `assertchecks/references/cap3.md`: prerequisites (check and token via the AssertChecks CLI),
   client download, start/run/report, trigger, partial runs, error path, NSDK runners.
2. `SKILL.md`: description and capability table list cap3. `cap2.md`: one pointer line to cap3.
3. Keep cap1/cap2 behaviour and the helper tests unchanged.

Cross-repository: code in `finoge-app/narrative-skills` branch `ASSERT-4-assertchecks-publish`.
