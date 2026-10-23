# ASSERT-40 handoff

## What changed

- `src/server/ingest.ts`: the dry run's format half (`dryRunFormat`) is shared; `checkFormat` needs no
  check; `checkReport` (with a ping token) adds the judgement as before.
- `src/routes/api/check.ts`: `POST /api/check`, the token-free format check; records nothing.
- Client: `check` without `ASSERTCHECKS_PING_TOKEN` calls it and prints "valid format (no check token,
  so not judged)"; with a token it is unchanged. The ping token is now required only by `start` and
  `report`.
- README, connect guide; unit test for the token-free path.
- Skill (finoge-app/narrative-skills, branch `ASSERT-40-check-without-token`): cap4 Dry run, cap0 and
  cap2 say the dry run needs no token.

## AC results

Local origin `http://127.0.0.1:63040`, no token, not signed in.
1. Pass. A valid sandbox catalog → "valid format …", exit 0; the same catalog with a case's `then`
   removed → "format error: catalog.cases[0]: missing then", exit 1. Run count unchanged (27 → 27).
2. Pass. With the sandbox dev ping token the same command prints "valid; nothing was recorded" as before.
3. Checked after deploy (cap4 comment).

Mechanical defence: typecheck, 61 tests, build — pass.

## Deviations

None.

## Environment

Port 63040. No env keys, no migration.

## Residual

NSDK's own docs still say its dry run needs the ping token; Codex updates them in NSDK.

## Check

None; auto-deploy.

## Decided for you

- Without a token the dry run checks format only; judging a result needs a check's selection, so it
  stays with the token.
- The token-free endpoint is public like the schemas it applies; bodies are limited to 5 MB as before.
