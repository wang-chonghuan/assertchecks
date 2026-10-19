# AssertChecks

healthchecks.io for end-to-end assertions. Each project runs its own tests where it always runs them
and reports every run here; AssertChecks judges whether the run arrived on time, ran in full, and
whether every declared assertion passed, then shows exactly which case and which assertion broke.

The public homepage explains the product and how to connect a project, with a "Copy for your agent"
button that copies the whole guide (`src/lib/connect-guide.ts`). The report format is published at
`/schemas/catalog.schema.json` and `/schemas/result.schema.json`.

## How it works

Each project runs its own tests and reports them with the AssertChecks client, served by the site:

```bash
curl -fsSO https://assertchecks.com/client/assertchecks.mjs
export ASSERTCHECKS_PING_TOKEN=<the check's ping token>
run_id="$(node assertchecks.mjs start --version web=https://app.example/version.json --version api=https://app.example/api/version)"
npx playwright test ...; code=$?
node assertchecks.mjs report --run-id "$run_id" --exit-code "$code" \
  --playwright results.json --catalog e2e.json \
  --version web=https://app.example/version.json --version api=https://app.example/api/version
```

`start` prints only the run ID. `--trigger schedule|manual` defaults to `schedule` for scheduled
GitHub Actions runs and `manual` otherwise; GitHub Actions also supplies the runner kind and run
link. `--cases ID,ID` names the cases of a partial run. A version URL must return JSON with a
40-character `sha`; each read is tried up to three times (waiting 2 s, then 4 s) before the
version is recorded as unreadable. If there is no report, `report --error "<why>"` records the run as incomplete.
The client never prints the token, uploads the Playwright report unchanged, refuses to upload a
report containing credential-like strings, and exits non-zero when the run could not be reported.

### Push API

| Endpoint | Body | Response |
|---|---|---|
| `POST /api/ping/:token/start` | `{testSha, runner: {kind, runUrl}, trigger, cases?, deployed: {name: sha}}` | `{runId}` |
| `POST /api/ping/:token/report` | `{runId?, exitCode, testSha, trigger, cases?, deployedEnd: {name: sha}, result, catalog}` or `{runId?, exitCode, error}` | `{runId, outcome, errors?}` |
| `POST /api/ping/:token/check` | `{catalog, result?, exitCode?, cases?}` | `{valid, errors?, outcome?, reason?}` |

The format is fixed and published as JSON Schema: `/schemas/catalog.schema.json` (the catalog's core
fields; projects may add their own, which are kept and ignored) and `/schemas/result.schema.json`.
The server validates every report against these same files. A report that does not match is recorded
as `incomplete`, and the reply lists each wrong field (`errors`, for example
`catalog.cases[0].then[0]: missing expect`); the client then exits non-zero. `check` is a dry run:
it validates a catalog, and a result when given, judges it against the check's selection (versions
are not compared), and records nothing. The client runs it with
`node assertchecks.mjs check --catalog e2e.json [--playwright results.json --exit-code N] [--cases ID,ID]`.

`result` is an envelope: `{"format": "playwright", "report": <Playwright JSON report>}` (case IDs come
from the test title prefix `E2E-001: …`, Then IDs from step titles `Then A1: …`), or
`{"format": "cases", "cases": [{id, title?, status, ms?, thens: [{id, status}], error?}]}` for producers
that are not test runners. `catalog` is the AssertChecks case catalog (`version: 1` and `cases[]` with
`id`, `title`, `status`, `run`, `given`, `when`, `then[]` of `{id, expect}`, and optional `failure`,
`group` and `tags`). `group` is one free-form name and `tags` a comma-separated string such as
`"smoke,permissions"`; the check page groups cases by `group` and filters by group or a single tag.
Neither selects, permits or judges anything: runs are still selected by `status`, `run` and named
case IDs.

A full run is judged against the catalog cases in the check's selection (default: status `active`,
run `nightly`); a run that names `cases` is partial and judged against exactly those. A run is
`passed` only when the exit code is 0, the reported cases are exactly the expected ones, nothing was
skipped or flaky, every declared Then passed, and every tested version was recorded and unchanged
between start and end. Assertion failures are `failed`; anything not fully executed is `incomplete`.
Results with credential-like strings are rejected (HTTP 422) and not stored. Bodies are limited to
5 MB. Unknown tokens return 404.

Each check shows its latest finished full run. When that run's catalog removed a required case, or
moved one out of the check's selection, compared with the previous full run, the check shows a
"Catalog changed" notice; the run is still judged as reported. Status (`new`, `up`, `failing`, `late`) follows that
run; `late` applies only to checks with a period and only scheduled runs reset it, so manual runs
cannot hide a missing scheduled run. A check without a period is run on demand. The web UI is
read-only; times are shown in UTC.

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
pnpm admin project:remove <slug> --confirm <slug>
pnpm admin user:remove <email> --confirm <email>
pnpm admin check:add <project-slug> <check-slug> --name <name> --env <env> --period <seconds|none> --grace <seconds> [--select-status active] [--select-run nightly]
pnpm admin check:update <project-slug> <check-slug> [--slug] [--name] [--env] [--period <seconds|none>] [--grace] [--select-status a,b] [--select-run a,b]
pnpm admin check:token <project-slug> <check-slug>
```

## Deployment

Built as a Node container (`node .output/server/index.mjs` on port 3000) and deployed to Azure
Container Apps with the n-easyapp substrate. It is served at https://assertchecks.com; the Container
App's default hostname keeps working for clients configured with it.
