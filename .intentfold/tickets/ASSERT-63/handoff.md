# ASSERT-63 handoff — hide a check from the project overview

## What changed

A reversible, presentation-only way to keep a check off the project overview without touching its data.

- `db/migrations/014_check_hidden.sql` — adds `checks.hidden boolean NOT NULL DEFAULT false` (additive).
- `src/server/queries.ts` — `overview()` card query now filters `AND hidden = false`. No other query
  changed: `caseBugs` (cross-environment status), `findCheck` (detail page) and the case page still
  read hidden checks, so their data, direct links and "passed in every environment" semantics are intact.
- `scripts/admin.ts` — new `check:hide` / `check:show <project> <check>` commands; `list` now prints the
  `hidden` column; USAGE updated.

## Verification

- Mechanical defence green in the worktree: `pnpm typecheck`, `pnpm test` (95 pass), `pnpm check:infui`,
  `pnpm build`.
- Functional proof runs at close against the deployed shared database: after `pnpm migrate` and
  `pnpm admin check:hide nsdk prod`, the exact `overview()` card query for NSDK returns DEV, Local and
  prod-live but not PROD, while the PROD check row and its runs remain present (detail page still works).

## Operation at close (cap4)

Set NSDK's `prod` check hidden in production so the live overview shows DEV, Local and prod-live only.
Reversible with `pnpm admin check:show nsdk prod`.

## Notes

- Additive migration only; no data deleted. PROD's real run history is preserved.
- No new dependency, no schedule, no UI restructuring.
