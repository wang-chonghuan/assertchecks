# ASSERT-12 acceptance checks

## AC1 Charter matches the repository

Check: for every path, file and command named in `charter/engineering.md`, `ui.md` and
`operations.md`, confirm it exists or runs; search the charter for "(review)"; diff `product.md`
against the base.
True when: every named path exists, no "(review)" remains, and `product.md` is unchanged.

## AC2 Removal commands are safe and complete

Check: create a throwaway project with a check, a run and a member, plus a throwaway user with a
session; run `project:remove` and `user:remove` first without and then with `--confirm`; count rows
before and after.
True when: without confirmation nothing is deleted and the command exits non-zero; with it, the
project and its checks, runs and memberships are gone, the user and its sessions are gone, and the
counts of every other project, user, check and run are unchanged.

## AC3 Post-deploy check covers the homepage and formats

Check: run the post-deploy commands from `operations.md` against production.
True when: they include `/` and `/schemas/catalog.schema.json`, and all return 200.

## AC4 The agent copy is tested against the guide

Check: `pnpm test`.
True when: a test asserts that `agentPrompt()` contains every code sample of the guide and both
format URLs, and it passes; removing a sample from the prompt would make it fail.
