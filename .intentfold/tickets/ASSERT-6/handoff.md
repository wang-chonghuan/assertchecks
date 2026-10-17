# ASSERT-6 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

- Default project: opening any project page records it in an httpOnly `ac_project` cookie
  (`src/server/session.ts`, `src/server/fns.ts`); `getMe` returns it as `lastProject` only when the
  user still belongs to that project, and `/` redirects there, otherwise to the first project by name.
- Non-passed cases (`notPassed`, from the latest full run; skipped, missing and not-run Then count):
  listed on the overview card (up to 5, then "and N more") and in a "Not passed in the latest run"
  section on the check page with the Then steps that did not pass and the error excerpt expanded.
- Cases not run automatically (`outsideRun`): catalog cases outside the check's selection, excluding
  retired, with the catalog's `failure` note — listed on the card and in a "Not run automatically"
  section on the check page.
- Tags: Draft orange, Manual only grey; failed cases keep the red Failed tag.
- `src/lib/types.ts`, `src/server/queries.ts`, overview and check pages, `src/components/status.tsx`.

## AC results

Preview on port 63006 against the shared database; NSDK data read-only; AC 1 used a throwaway user
with two throwaway projects, removed afterwards.

1. **Last opened project — passed.** With a remembered project the user cannot access, sign-in landed
   on the first project by name (`a6-alpha`); after opening `a6-beta`, signing out and in landed on
   `a6-beta`; after revoking that membership, `/` landed on `a6-alpha`.
2. **Card lists non-passed cases — passed.** After NSDK ENG-1638 made E2E-094 active, DEV run 30
   (93/94, failed) shows "Not passed (1) — Failed E2E-094 …" on the DEV card; earlier all-passed runs
   showed no such list (checked before ENG-1638 with runs 25/26 and a ticket-scoped all-passed check).
3. **Check page lists non-passed cases first — passed.** DEV page shows "Not passed in the latest run
   (1)" above the full table: E2E-094, A1 Failed, error "Expected: 118094.78 / Received: 116139.22".
   An all-passed check showed no such section.
4. **Cases outside the nightly run — passed.** DEV shows "Not run automatically (6)": E2E-004, 005,
   022, 024, 073 (Draft) and E2E-006 (Manual only), each with its catalog note; Local/PROD (no runs)
   show none.
5. **Tag colours — passed.** Computed styles: Draft text rgb(212,107,8) on rgb(255,247,230); Manual
   only on rgb(245,245,245); Failed rgb(255,77,79).

Mechanical defence: typecheck, 21 unit tests, build — passed. ips-antdesign lint: 0 issues.

## Deviations

None. Two layout fixes during development: card lists moved out of `Descriptions` so long titles
truncate; the not-run table no longer uses `max-content` width so notes wrap.

## Environment

Web port 63006. No env keys or migrations.

## Residual

None. The owner asked that acceptance data never be attached to their account; the temporary
`assert-6-test` project was removed and later checks used a throwaway user.
