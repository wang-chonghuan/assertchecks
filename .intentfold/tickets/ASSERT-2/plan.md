# ASSERT-2 plan

Written alongside implementation, after the grill (the grill questions were drafted from the code
before any change).

## What the code says that the ticket does not

- The server already parses Playwright reports and judges them; the only consumer of the push API
  so far was the canceled ENG-1631 script, so the contract can change without a compatibility layer.
- `runs.deployed_start/end` are JSONB, so arbitrary component names need no schema change.
- ASSERT-1 (base of this branch) shows each check's latest finished run; "full run" must now be
  defined so a named run cannot replace it.

## Route

1. Migration `002`: optional `checks.period_seconds`; `checks.selection` (default active+nightly);
   `runs.trigger` (default manual); `runs.cases` (named cases; non-null = partial run).
2. `judge.ts`: `result` envelope with `playwright` (existing parser) and `cases` formats; expected
   set from the check selection or the named cases; versions as any component map.
3. `status.ts`: status from the latest finished full run; lateness only for checks with a period,
   anchored on the latest scheduled full run or the check's creation.
4. `ingest.ts`: `trigger`, `cases`, `result`, and `error` for runs with no result.
5. `queries.ts`/pages: latest full run, partial-run and running notices, trigger tag, schedule text,
   dynamic version rows.
6. `scripts/admin.ts`: `--period none`, `--select-status/--select-run`, `--slug`.
7. `public/client/assertchecks.mjs`: zero-dependency client served at `/client/assertchecks.mjs`.
8. README: client usage and push contract. Tests for judge, status and client.
9. NSDK checks: rename `dev-nightly` to `dev` (token kept, daily), add `local` and `prod`
   (manual only) — applied when deploying, since local and production share one database.
