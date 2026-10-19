# ASSERT-4 handoff

## What changed

In `finoge-app/narrative-skills`, branch `ASSERT-4-assertchecks-publish` (commit `e0aa9db`):

- `assertchecks/references/cap3.md` (new): publish a run to AssertChecks — prerequisites (check and
  token via the AssertChecks CLI, token only in `ASSERTCHECKS_PING_TOKEN`), client download from the
  site, `start` / test command / `report`, version URLs, trigger defaults, partial runs with
  `--cases`, the `--error` path, failure handling, and NSDK runner usage (`runs-on: [self-hosted,
  assertchecks-nsdk]`, no `playwright install --with-deps`, `xvfb-run`).
- `assertchecks/SKILL.md`: description and capability table list cap3.
- `assertchecks/references/cap2.md`: one line pointing to cap3 for publishing.

## AC results

1. **SKILL.md lists cap3 and links its reference — passed.**
2. **Following cap3 completes a report and shows it — passed after deployment.** With a
   ticket-scoped check (`assert-4-test/cap3`, manual only), the client was downloaded from production
   and `start`/`report` run exactly as written with a real NSDK Playwright report (ENG-1632, 92/92)
   and its catalog: run 24 `passed`. The check page (local server on the same database, signed in as
   the owner account) shows run 24 with all cases and Then results. The first attempt
   (run 23) was `incomplete` because one DEV version read failed transiently, as the rules require.
3. **Existing skill tests and cap1/cap2 unchanged — passed.** `node --test
   assertchecks/tests/catalog-changes.test.mjs`: 30 passed; the only cap2 change is the pointer line.

## Deviations

None from `plan.md`.

## Environment

No ports or env keys.

## Residual

- A transient DEV version-read failure makes a run incomplete. A bounded retry in the client would
  reduce false incompletes; it is a client change for a separate ticket.
- Ticket-scoped data to remove at close: project `assert-4-test` (runs 23–24).
