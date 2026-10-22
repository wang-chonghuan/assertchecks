# ASSERT-38 plan

## What the code already says

- The client (`public/client/assertchecks.mjs`) is one zero-dependency file that every command reads
  `ASSERTCHECKS_PING_TOKEN` for; `link` posts to `/api/ping/<token>/link`, which `ingest.linkCases`
  checks against that check's newest catalog and records as `client (check <slug>)`.
- The failure report is per check: `queries.bugReport(userId, project, check)` gives the data and
  `lib/bug-report.recentBugReport(origin, report)` renders the text in the browser with
  `window.location.origin`. Its last instruction tells the agent to link with the ping token.
- A case's tickets belong to the project (`ticket_links.case_id`), so a person's `link` needs only the
  project; "in the current catalog" becomes "in the newest catalog of one of the project's checks".
- Signed-in pages live under `_app`, whose guard redirects to `/login` without remembering where the
  person was going; `/login` always lands on `/p`.
- `requireUser()` already maps the Clerk session to the CLI-created user; an email without a user
  gets a 404.
- No server code builds absolute URLs yet; behind Azure's ingress the request URL may say `http`.

## Route

1. **Migration `008_client_tokens.sql`** (additive): `client_tokens(id, token_hash unique, code unique,
   user_id → users on delete cascade, created_at, approved_at)`; a row is pending until approved.
2. **`src/server/client-tokens.ts`**: start a login from the client's token hash (deletes pending rows
   older than 10 minutes, returns a code like `ABCD-EFGH`); the person behind a bearer token, or
   "waiting"; sign out; the pending request for the approval page; approve (only unexpired, unclaimed
   rows); the public origin of a request (`x-forwarded-proto`/`host` when present).
3. **API routes `src/routes/api/cli/`**: `session` (POST start, GET who, DELETE sign out), `bugs` (GET:
   no project → the person's projects; no check → the project's checks; both → the report text, the
   same function the button uses), `link` (POST project, cases, ticket). Bearer only; Clerk cookies
   are not read here. Not a member → 404.
4. **`ticket-links.ts`**: one case-link insert shared by the page's Attach and the client's link; the
   client's link refuses cases outside the project's newest catalogs and records the person's email.
   Remove `ingest.linkCases` and `/api/ping/$token/link`.
5. **Approval page `/_app/cli/$code`** with server functions to read and approve it; the guard and
   `/login` carry a same-origin `redirect` so a person who signs in first comes back to it.
6. **Client**: `login`, `logout`, `bugs`, `link` use `~/.config/assertchecks/credentials.json`
   (`XDG_CONFIG_HOME` respected; per origin; file 0600). `login` writes the pending token first, prints
   the address and code, then waits up to 10 minutes, so an agent whose command is cut off still ends
   signed in once the person approves. Project from `--project` or `assertchecks/config.json`
   `project`. The ping token is needed only by `start`, `report`, `check`.
7. **Report text**: the link instruction names the project slug and the signed-in client.
8. **Operator CLI**: `client:revoke <email>` for a lost computer.
9. **Docs**: README, connect guide, client header, `engineering.md` (structure, credentials),
   `operations.md` (acceptance sign-in, revoke).
10. **Skill (narrative-skills)**: cap7 fetches the report with `bugs` and links with `link` after `login`;
    cap0's `config.json` template gets `project`; SKILL.md's cap7 line.

## Departures from the ticket's proposed solution

None of substance. `bugs` without `--check` lists the checks instead of printing every check's
report, which keeps one report format.
