# ASSERT-31 handoff

A case's run policy is now `regular` (part of every full run) or `on-demand` (only when named),
replacing `nightly` and `manual`, which read like a schedule. The owner chose the names on 2026-10-21.
How often a check runs stays with its CI schedule and period; run triggers (`schedule`, `manual`)
are unchanged.

## What changed

- `public/schemas/catalog.schema.json`: `run` enum `regular` / `on-demand`.
- `src/server/judge.ts`: default selection `run: ['regular']`; `scripts/admin.ts` default and help.
- `db/migrations/005_run_regular_on_demand.sql`: the checks' selection default, the existing checks'
  selections, and the catalogs stored with past runs move to the new values, so older runs keep
  showing their cases and no code accepts both names. A rolled-back dry run on the shared database
  rewrote 3 checks and 13 runs, left none on the old values, and read NSDK run #61 as regular 173 /
  on-demand 27.
- UI: the outside-the-run tag reads "On demand"; the case page reads "In every regular run" or
  "On demand, only when named"; a check without a period reads "No schedule" (was "Runs on demand").
- Connect guide, README and tests follow.
- The assertchecks skill's format text, capability wording and templates follow in
  finoge-app/narrative-skills (ASSERT-31 branch).

## AC results

`pnpm typecheck && pnpm test && pnpm build` pass (39 tests); antd lint passes; the skill's 31 tests
pass. The migration dry run is above.

## Environment

No env keys. Migration 005 changes stored data.

## Residual

NSDK must rename its catalog values, schema, config and workflow on the same day, before its next
report; the prompt is in the ticket comment.

## Check

None.

## Decided for you

- "No schedule" replaces "Runs on demand" for checks without a period, so "on demand" means only the
  case policy.
