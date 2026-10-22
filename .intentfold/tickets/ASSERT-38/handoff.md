# ASSERT-38 handoff

## What changed

- `db/migrations/008_client_tokens.sql` (applied): `client_tokens` — the hash of a token the client made,
  a short code, and the user once approved. A row without a user is a sign-in waiting for approval, void
  after 10 minutes.
- `src/server/client-tokens.ts`: start a sign-in from the client's token hash (clears expired ones), the
  person behind a bearer token or "waiting", sign out, the request for the approval page, approve, and
  the public origin behind the ingress.
- Client routes `src/routes/api/cli/`: `session` (POST start, GET who, DELETE sign out), `bugs` (no
  project → the person's projects; no check → the project's checks; both → the report text the "Copy
  bugs" button renders, from the same function), `link` (project, cases, ticket). Bearer only; a project
  the person is not a member of is a 404.
- `src/server/ticket-links.ts`: one case-link insert shared by the page's Attach and the client; the
  client's link refuses cases outside the project's newest catalogs and records the person's email.
  `caseIds` is now the one case-list validator (the server function uses it too).
- Removed the ping-token link: `src/routes/api/ping/$token/link.ts` and `ingest.linkCases`. A ping token
  now only starts, reports and dry-runs.
- Approval page `src/routes/_app/cli/$code.tsx` ("Approve this computer?", the code, its time, Approve;
  approved and expired states) with `getClientLogin` / `approveClientLogin` in `fns.ts`. `_app` and
  `/login` carry a same-path `redirect`, so signing in first returns to the page.
- Client `public/client/assertchecks.mjs`: `login`, `logout`, `bugs`, `link` use `credentials.json` in
  the person's configuration directory (per origin, mode 600); `login` saves the pending token before
  waiting, so approving still completes a sign-in whose command was cut off; the project comes from
  `--project` or `assertchecks/config.json`. `ASSERTCHECKS_PING_TOKEN` is needed only by
  `start`/`report`/`check`.
- Copied reports (`src/lib/bug-report.ts`) tell the agent to link with the signed-in client and name the
  project slug.
- Operator CLI: `pnpm admin client:revoke <email>`.
- Docs: README "As a person, from the terminal", connect guide sample, client header; charter
  `engineering.md` (structure, the two credentials) and `operations.md` (acceptance as a person, revoke).
- Tests: client link/login/bugs tests replace the ping-token link tests; `tests/client-tokens.test.ts`.
- Skill: `finoge-app/narrative-skills#41` (branch `ASSERT-38-client-login`): cap7 fetches the report with
  `bugs`, signs in with `login` when needed and links with `link`; cap0's `config.json` template has
  `project`; 31 skill tests pass. Not merged.

## AC results

Local origin `http://127.0.0.1:63038`, client with a scratch `XDG_CONFIG_HOME`, no ping token, browser
signed in as the sandbox test account; data only in `sandbox`.

1. Login — pass. `login` printed the address and code; approving in the browser ended it with exit 0 and
   "Signed in … as sandbox+clerk_test@example.com". Credentials file `-rw-------` outside the repo; the
   token appears in no file of the scratch repo, the output or the worktree.
2. Expiry — pass. A pending row aged to 11 minutes: the page says the request expired with no Approve;
   the client exited 1 ("the sign-in request expired") and removed its pending entry.
3. Report — pass. `bugs` listed sandbox's checks (exit 1); with no config it listed the account's
   projects; `bugs --check dev` was byte-identical to the dev page's "Copy bugs" clipboard (SHA-256
   5da0e521…943f, 30401 bytes).
4. Not a member — pass. `bugs --project nsdk --check dev`: exit 1, one line, nothing of nsdk.
5. Link — pass. E2E-094 shows the ASSERT-38 ticket "by sandbox+clerk_test@example.com" on its case
   page; `E2E-094,E2E-999` was refused whole ("nothing was linked; not cases of project sandbox:
   E2E-999"); linking again reports "already linked".
6. Ping token cannot link — pass. `POST /api/ping/<sandbox dev token>/link` → 404; `check --catalog`
   with that token still validates.
7. Logout — pass. `logout`, then `bugs` → not signed in; the old token on `GET /api/cli/session` → 401.
   `pnpm admin client:revoke` also ended a live sign-in.
8. Skill — pass. A fresh agent in a scratch repo for `sandbox`, given only "用 assertchecks cap7 为失败用例挂单"
   and the skill from the branch, found it was not signed in, ran `login` and stopped with the address;
   after approval it fetched `bugs --check dev` and linked the existing ticket to all 17 failing cases.
   Its transcript contains no token. The approval also proved the sign-in redirect: signed out, the
   address went to `/login?redirect=…` and came back to the approval page after signing in.

Mechanical defence (`pnpm typecheck && pnpm test && pnpm build`): pass, 60 tests.

## Deviations

- `bugs` without `--check` lists checks rather than printing every check's report (grill 2).
- The ping-token link is removed in this ticket with no transition (grill 1).
- Before handoff, a fresh-eyes review changed wording: the page no longer assumes the person ran the
  command ("by you or your coding agent"), a key icon instead of "!", and client errors say what was
  not found and that nothing was linked.

## Environment

Port 63038. No env keys added, changed or removed. Migration 008 is applied to the shared database.

## Residual

- The production approval page and messages are verified only locally; the post-deploy check covers the
  site, not a production sign-in.
- Sandbox now carries the ASSERT-38 ticket on 17 dev cases from AC 8 (left for review, operations.md).

## Check

1. Run `curl -fsSO http://localhost:63038/client/assertchecks.mjs && ASSERTCHECKS_ORIGIN=http://localhost:63038 node assertchecks.mjs login`
   and open the address it prints — the approval page's wording and layout, then the terminal's
   "Signed in" line.
2. http://localhost:63038/p/sandbox/checks/dev — cases now showing the ASSERT-38 ticket, linked from the
   terminal.

## Decided for you

- Ping-token link removed at once; only cap7 used it and it changes in the same delivery.
- `bugs` without a check lists the checks; one report format.
- `login` saves before waiting, so an agent's cut-off command still ends signed in after approval.
- Client tokens do not expire; `logout` or `pnpm admin client:revoke <email>` ends them.
- Approval page lives behind sign-in and returns there after signing in.
- Times on the approval page stay in UTC, as the charter requires.
