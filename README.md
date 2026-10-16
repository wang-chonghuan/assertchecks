# assertchecks

healthchecks.io for e2e assertions: a runner pushes each Playwright run here, and assertchecks
records whether every declared assertion actually passed, not just whether the job ran.

## How it works

A runner (for example a scheduled GitHub Actions job) calls the push API for a check:

| Endpoint | Body | Response |
|---|---|---|
| `POST /api/ping/:token/start` | `{testSha, runner: {kind, runUrl}, deployed: {web, api}}` | `{runId}` |
| `POST /api/ping/:token/report` | `{runId?, exitCode, testSha, deployedEnd: {web, api}, report, catalog}` | `{runId, outcome}` |

`report` is Playwright's native JSON report and `catalog` is the IntentGuard-style case catalog
(`cases[]` with `id`, `status`, `run` and `then[].id`). Case IDs come from the test title prefix
(`E2E-001: …`) and Then IDs from step titles (`Then A1: …`).

A run is `passed` only when the exit code is 0, the reported cases are exactly the catalog's
active nightly cases, nothing was skipped or flaky, every declared Then passed, and the deployed
SHAs did not change during the run. Assertion failures are `failed`; anything not fully executed is
`incomplete`. Reports containing credential-like strings are rejected (HTTP 422) and not stored.
Bodies are limited to 5 MB. Unknown tokens return 404.

Check state (`new`, `up`, `failing`, `late`) is derived on read from the last finished run and the
check's period plus grace. The web UI is read-only; times are shown in UTC.

## Development

Requires Node 24 and pnpm. Create `.env` (git-ignored) with `DATABASE_URL` and `DATABASE_SCHEMA`.

```bash
pnpm install
pnpm migrate
pnpm dev
```

```bash
pnpm typecheck
pnpm test
pnpm build
```

Migrations in `db/migrations/` are additive only and run with `pnpm migrate`.

## Administration

Users, project memberships and checks are managed only with the CLI. Generated passwords and ping
tokens are printed once and stored only as hashes.

```bash
pnpm admin list
pnpm admin user:add <email>
pnpm admin user:password <email>
pnpm admin project:add <slug> <name>
pnpm admin member:add <email> <project-slug>
pnpm admin member:remove <email> <project-slug>
pnpm admin check:add <project-slug> <check-slug> --name <name> --env <env> --period <seconds> --grace <seconds>
pnpm admin check:update <project-slug> <check-slug> [--name] [--env] [--period] [--grace]
pnpm admin check:token <project-slug> <check-slug>
```

## Deployment

Built as a Node container (`node .output/server/index.mjs` on port 3000) and deployed to Azure
Container Apps with the n-easyapp substrate.
