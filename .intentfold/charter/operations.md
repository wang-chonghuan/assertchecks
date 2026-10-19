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
pnpm antd-css && node --env-file-if-exists=.env node_modules/vite/bin/vite.js dev --port <ticket-web-port>
```

Confirm it responds:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://localhost:<port>/login
```

**Build and tests**

```bash
pnpm typecheck
pnpm test
pnpm build
```

**Acceptance**

- Browser: the built-in or headed Chrome at 1440×900 and 390×844, signed in locally as a
  ticket-scoped Clerk test email (`<ticket>+clerk_test@example.com`, which the Clerk development
  instance accepts with code `424242` and sends no mail) added with `pnpm admin user:add`. Delete
  that Clerk test user from the development instance's Users page with the rest of the test data.
- Push API: `curl` against the local or production origin with a ticket-scoped check's token.
- Data: `psql "$DATABASE_URL"` with `set search_path to "assertchecks-schema"` for read-only checks.
- Ticket-scoped test data: create it with `pnpm admin project:add`, `check:add`, `user:add` and
  `member:add`; remove it with the CLI, never with hand-written SQL:

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

**Deploy**

Apply migrations first (same database as local), then redeploy with n-easyapp cap2 from a clean,
pushed `main`:

```bash
pnpm migrate
python3 <n-easyapp-skill>/scripts/redeploy_current_repo.py --project assertchecks --architecture tanstack-start
```

**Post-deploy check**

```bash
for page in / /login /schemas/catalog.schema.json /client/assertchecks.mjs; do curl -fsS -o /dev/null -w "$page %{http_code}\n" "https://assertchecks.com$page"; done
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

**Ticket-scoped test data.** Because local runs use the production database, acceptance creates its
own project, users and checks named after the ticket (for example `assert-12-test`), never attaches
them to a real user, and removes them with the CLI as soon as the evidence is recorded.

## Redlines

1. **Recording a criterion as passed when its check did not run** — forbidden outright.
2. **Changing or deleting data of real projects (`nsdk`, `bf`) or their users from an acceptance
   check** — forbidden outright. Acceptance writes only to ticket-scoped test objects.
3. **Creating or deleting cloud resources** — not without the human's explicit approval.
4. **Deploying this project for the first time** — not without the human's explicit approval.
5. **Changing production schema, infrastructure, ingress, scaling, or required environment keys** —
   not without the human's explicit approval. Additive migrations that a ticket's approved plan names
   are part of that ticket's approval.
6. **Pointing a production domain at a new target** — not without the human's explicit approval.
7. **Reporting a deploy as complete without running the post-deploy check** — forbidden outright.
8. **Rotating or replacing an existing check's ping token, or the Clerk secret key** — not without
   the human's explicit approval; other repositories and the running site depend on them.
