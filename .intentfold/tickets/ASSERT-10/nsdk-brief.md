# NSDK brief: own the project rules the assertchecks skill no longer carries

For Codex, as one NSDK ticket. English, as NSDK tickets are.

## Why

The assertchecks skill is now generic: it serves any project, and every project-specific rule must
live in that project's own `assertchecks/` documents. The skill reads `assertchecks/system-design.md`
for environments, accounts and credentials, authentication, test data, run permissions, tested
versions and the runner, and stops to ask when a rule is missing. NSDK's `system-design.md` already
covers most of this; the items below were in the skill and must now be stated in NSDK.

## What to do

Update `assertchecks/system-design.md` (and `README.md` where it already holds the detail), in the
document's existing language and style, so that each of these rules is stated there:

1. **Authentication.** Real CIAM sign-in for the mature account via `fixtures/login.ts`, with the
   identity check against `/api/auth/me`. Onboarding and auth-lifecycle cases use the official
   unauthenticated entrypoint and a fresh account, never 1006.
2. **One-time codes.** Automated OTP retrieval uses only `assertchecks/fixtures/mailbox.mjs` and
   `assertchecks/mailbox.json` (the owner-approved ENG-1611 client, no second provider client). Use
   unique local-tagged mailboxes for onboarding. Mailbox connectivity is not evidence of real CIAM
   delivery.
3. **Environments.** dev (the default), prod and local. Local means the normal local
   frontend/backend using DEV services and real CIAM, not a local database or simulated
   application. Only the explicit local target may use loopback HTTP. Follow the project's
   ticket-port startup commands. Local startup must not take over shared jobs or write unrelated
   users' data. Report local application source revisions separately from deployed
   Airflow/provider infrastructure revisions.
4. **Run permission switch.** `ASSERTCHECKS_ALLOW_SHARED_RUN=<environment>` must be set to the
   selected authorized environment for any shared run. Together with the existing
   `ASSERTCHECKS_ALLOW_PROJECT_CREATE`, `ASSERTCHECKS_ALLOW_PLAN_EDIT` and
   `ASSERTCHECKS_ALLOW_ONBOARDING`, these are the run-permission switches the skill now looks up
   here.
5. **Onboarding scope.** Before a long onboarding run, confirm new-account, Fake Bank authorization,
   model-cost and operational-alert scope. Use only the repo-configured Fake Bank OAuth flow and
   never ask for real banking credentials. Local entry checks may stop before email submission
   without claiming that signup or onboarding passed. Use the configured processing budget.
6. **Tested versions** (new section). For the selected environment's `config.json` base URL, pass
   `--version web=<base>/version.json --version api=<base>/api/version` to both `start` and `report`.
7. **Runner** (new section). Scheduled runs use the self-hosted runners on `vm-nsdk-automation`
   (`runs-on: [self-hosted, assertchecks-nsdk]`). They run as an account without sudo and already
   have Google Chrome and xvfb: do not run `playwright install --with-deps`, and run the suite under
   `xvfb-run --auto-servernum`. Runs queue in the `nsdk-shared-dev-tests` concurrency group because
   they share the DEV account.
8. **Recording and data classification.** `playwright.config.ts` places `fixtures/redact.ts` before
   the native reporters, and auth/OTP traces, screenshots and video stay off. Each case's
   `data.mode` must be corrected when the actual effects of its final code contradict it.

Then validate the catalog against the now-published AssertChecks format with the client's dry run,
using the DEV check token:

```bash
curl -fsSO https://ca-assertchecks.kindsmoke-4d84c417.northeurope.azurecontainerapps.io/client/assertchecks.mjs
ASSERTCHECKS_PING_TOKEN=<DEV check token> node assertchecks.mjs check --catalog assertchecks/e2e.json
```

It must print "valid". NSDK's own `e2e.schema.json` stays: it is stricter than the AssertChecks
format (it requires `type`, `data` and `projects`), which is allowed. It must not drop or change an
AssertChecks field.

## Out of scope

No test, catalog, fixture, Playwright config or workflow behavior changes. The nightly DEV run must
report exactly as before.

## Acceptance

- Each of the eight rules above can be found in NSDK's `assertchecks/` documents.
- The dry run prints "valid".
- The next nightly DEV run reports to AssertChecks as before.
