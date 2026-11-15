# ASSERT-63 plan — hide a check from the project overview

## Problem

The project overview (Tests tab) renders one card per check. NSDK shows DEV, Local, PROD and
prod-live. For a demo the owner wants only prod-live shown and PROD hidden, but PROD holds real run
history that must be preserved, so deletion is not acceptable.

## Approach

A presentation-only, reversible hide:

1. **Migration `014_check_hidden.sql`** — add `hidden boolean NOT NULL DEFAULT false` to `checks`.
   Additive; default false means every existing check stays visible when the migration applies.
2. **`overview()` query (`src/server/queries.ts`)** — add `AND hidden = false` to the card query only.
   Nothing else changes: `caseBugs` cross-environment status, the check detail page (`findCheck`) and
   the case page all still read the hidden check, so its data and direct links keep working and the
   "passed in every environment" semantics are unchanged.
3. **CLI (`scripts/admin.ts`)** — `check:hide` / `check:show <project> <check>` flip the flag; `list`
   now shows the `hidden` column so the operator can see state. This makes the switch reversible by
   the owner without raw SQL.
4. **Data operation (cap4, in production)** — set NSDK's `prod` check hidden after the migration is
   deployed, so the live NSDK overview shows DEV, Local and prod-live only.

## Out of scope

- No change to bug/needs-ticket semantics or to any check detail/case page.
- No deletion of PROD data.
