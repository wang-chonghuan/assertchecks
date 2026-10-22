# Operations

Human-authored instructions for running, verifying, deploying, and operating this project. Commands
are repo-root-relative and executable as written. Section shape is fixed by
`.intentfold/readme.md`.

Most tickets end at merge. `Finish: auto-deploy` runs this file's deploy and post-deploy tools after
merge. Acceptance verification also uses this file, so stale commands block delivery.

*Seeded by IntentFold cap1 on 2026-10-17 from repository evidence; brought up to date with the
repository at the owner's request in ASSERT-12 (2026-10-19).*

## Contract

**Runtime**

One long-running Node process (TanStack Start / Nitro) serves the pages and the push API on the web
port. Local development connects to the same easy-app PostgreSQL schema as production; there is no
local database.

**Environments**

- Production: easy-app Container App `ca-assertchecks` in `rg-easyapp-shared` /
  `cae-easyapp-shared`, one replica, schema `assertchecks-schema` on `pg-easyapp-shared`. Public
  address `https://assertchecks.com`: Cloudflare zone `assertchecks.com` with the apex A record DNS-only
  to the environment's static IP, the `asuid` ownership TXT, and `www` proxied with a 301 redirect rule
  to the apex; the certificate is an Azure managed certificate (HTTP validation, auto-renewing). The
  Clerk production instance needs five DNS-only CNAMEs in the same zone: `clerk`, `accounts`, `clkmail`,
  `clk._domainkey` and `clk2._domainkey`, with the targets shown on its Domains page. The
  default hostname `https://ca-assertchecks.kindsmoke-4d84c417.northeurope.azurecontainerapps.io` stays in service for
  clients configured with it.
- Local: the dev server on the main or ticket port, using the same database.

**Evidence**

Acceptance evidence must read an authoritative surface, be reproducible, and be capable of failing.
Use the smallest observation that settles the criterion: a command, query, or browser interaction.
Code inspection alone is not evidence that behavior works.

## Tools

**Install**

```bash
pnpm install --frozen-lockfile
```

**Run locally**

Main checkout, fixed port 3000:

```bash
pnpm dev
```

For a ticket worktree, resolve ports with:

```bash
python3 <intentfold-skill>/scripts/ports.py .intentfold/project.json ticket <ticket-id>
```

Start the dev server on the returned web port:

```bash
pnpm antd-css && node --env-file-if-exists=.env node_modules/vite/bin/vite.js dev --port <ticket-web-port> --strictPort --host 127.0.0.1
```

Confirm it responds:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<port>/login
```

**Build and tests**

```bash
pnpm typecheck
pnpm test
pnpm build
```

**Acceptance**

- Sandbox: acceptance data lives in the standing project `sandbox` (checks `dev` and `prod`, error
  source the BF workspace, read-only). Its members are the owner, `chonghuan.wang@narrativebanking.com`,
  who reviews it with his own account, and `sandbox+clerk_test@example.com`, which the agent signs in
  with (the Clerk development instance accepts code `424242` and sends no mail). Its ping tokens are in
  `.credentials.local` as `sandbox/dev` and `sandbox/prod`; read them with awk, never print them.
- Browser: the built-in or headed Chrome at 1440×900 and 390×844, signed in locally as
  `sandbox+clerk_test@example.com`. Review links for the owner point at `/p/sandbox`.
- Push API: the client or `curl` against the local origin with a sandbox check's token.
- Data: `psql "$DATABASE_URL"` with `set search_path to "assertchecks-schema"` for read-only checks.
- A check that needs a project of its own (another member set, a non-member's 404) creates a
  ticket-scoped project with `pnpm admin project:add`, `check:add` and `member:add` and removes it
  with the CLI, never with hand-written SQL:

```bash
pnpm admin project:remove <slug> --confirm <slug>
pnpm admin user:remove <email> --confirm <email>
```

**Environment**

`.env` (git-ignored, copy it into each worktree): `DATABASE_URL`, `DATABASE_SCHEMA`, and the Clerk
development instance's `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Production receives the same
keys from the Container App (`DATABASE_URL` as secret `database-url`, `CLERK_SECRET_KEY` as secret
`clerk-secret-key`, both Clerk keys from the production instance) plus `PORT`. Clerk reads both keys
at runtime; nothing is baked in at build time.
Operator secrets created by the CLI are written to the git-ignored `.credentials.local`.

Connect a project's production errors to its Log Analytics workspace (and grant AssertChecks's
identity Log Analytics Reader on it, operations redline 9):

```bash
az monitor log-analytics workspace show -g <resource-group> -n <workspace> --query '{id:id, customerId:customerId}'
pnpm admin source:set <project-slug> --workspace-id <customerId> --workspace <id> [--roles <app-role,...>]
python3 <n-easyapp-skill>/scripts/grant_app_read_access.py --project assertchecks --role-scope "Log Analytics Reader=<id>"
```

Reading production telemetry needs no key in either place. Locally the dev server authenticates as
the developer's `az login`, which must be able to read the configured workspaces. In production the
Container App's system-assigned managed identity holds the Log Analytics Reader role on each
configured workspace and nothing else.

**Deploy**

Apply migrations first (same database as local), then redeploy with n-easyapp cap2 from a clean,
pushed `main`:

```bash
pnpm migrate
python3 <n-easyapp-skill>/scripts/redeploy_current_repo.py --project assertchecks --architecture tanstack-start
```

**Post-deploy check**

```bash
for page in / /login /privacy /schemas/catalog.schema.json /client/assertchecks.mjs; do curl -fsS -o /dev/null -w "$page %{http_code}\n" "https://assertchecks.com$page"; done
curl -fsS -o /dev/null -w "default hostname %{http_code}\n" "https://ca-assertchecks.kindsmoke-4d84c417.northeurope.azurecontainerapps.io/client/assertchecks.mjs"
az containerapp show -g rg-easyapp-shared -n ca-assertchecks --query 'tags."easyapp.commit"' -o tsv
git rev-parse origin/main
```

Every path must return 200 and the deployed commit tag must equal `origin/main`. Right after a
deploy the previous revision may answer for a short while; repeat the check until the new revision
does, rather than reporting the old one.

**Operations**

```bash
pnpm admin list
az containerapp logs show -g rg-easyapp-shared -n ca-assertchecks --tail 100
az containerapp revision list -g rg-easyapp-shared -n ca-assertchecks -o table
az role assignment list --all --assignee "$(az containerapp show -g rg-easyapp-shared -n ca-assertchecks --query identity.principalId -o tsv)" -o table
```

## Guidance

**Start before verifying.** Confirm each required service responds before driving it. A startup
failure is a stop and a report, not an acceptance failure.

**Choose authoritative evidence.** A database query proves a row exists but not that the UI shows
it. A browser proves rendered behavior but may not prove a background write completed. Use both only
when the criterion spans both surfaces.

**Use headed browser verification for formal UI acceptance.** Fall back to headless only when no GUI
is available, or when a check needs a session of its own (signed out, or a ticket-scoped user) that
must not disturb the human's signed-in browser; record which was used.

**Use stable locators.** Prefer role, label, placeholder, visible text, or a stable `data-testid`.
Locate the stable container first, then assert its contents.

**Treat dynamic output as dynamic.** Assert completion, placement, non-empty output, and shape rather
than exact generated wording. For streaming, wait for a completion signal or stable text; stale
content from a previous action cannot satisfy the check.

**Wait on conditions, not fixed sleeps.** For asynchronous behavior, poll or use web-first
assertions.

**Diagnose a failed check before changing it.** Decide whether the implementation failed or the
check targeted the wrong surface, then rerun the same check.

**Deploy from the merged revision.** A successful deploy command is not completion; the post-deploy
check is.

**Sandbox data.** Local runs use the production database, so acceptance writes only to `sandbox` or to
a ticket-scoped project. The sandbox stays between tickets so the owner can see the latest work
without switching accounts; a ticket may add runs, tickets and checks there and leaves them for review.

## Redlines

1. **Recording a criterion as passed when its check did not run** — forbidden outright.
2. **Changing or deleting data of real projects (`nsdk`, `bf`) or their users from an acceptance
   check** — forbidden outright. Acceptance writes only to `sandbox` and ticket-scoped test objects.
3. **Creating or deleting cloud resources** — not without the human's explicit approval.
4. **Deploying this project for the first time** — not without the human's explicit approval.
5. **Changing production schema, infrastructure, ingress, scaling, or required environment keys** —
   not without the human's explicit approval. Additive migrations that a ticket's approved plan names
   are part of that ticket's approval.
6. **Pointing a production domain at a new target** — not without the human's explicit approval.
7. **Reporting a deploy as complete without running the post-deploy check** — forbidden outright.
8. **Rotating or replacing an existing check's ping token, or the Clerk secret key** — not without
   the human's explicit approval; other repositories and the running site depend on them.
9. **Granting AssertChecks's identity read access to a project's workspace** — not without the
   human's explicit approval. **Granting it any role beyond Log Analytics Reader on a single
   workspace** — forbidden outright.
