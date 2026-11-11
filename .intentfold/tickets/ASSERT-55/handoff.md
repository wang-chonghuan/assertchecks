# ASSERT-55 handoff

## What changed

A project can grant an **email-domain group** so a run link can be shared with a whole team, viewable
read-only by anyone signing in at that domain; editing stays with explicit members.

- **No new table, no migration.** On the owner's direction, a domain group reuses `memberships`: a
  placeholder `users` row whose email is a bare domain (no `@`, so it can never be a real sign-in)
  stands for the group, and a membership to it grants everyone at that domain. (The first approach, a
  `project_domains` table, was dropped.)
- **`src/server/queries.ts`** — `project(viewer, slug)` now admits a viewer who is a member **or**
  whose email domain matches a group membership; it is the choke point for every read. Added
  `memberProject(userId, slug)` (member-only) for edits. `Viewer = { id: string | null; email }`.
  `me()` lists member + domain-group projects. Read functions (`overview`, `checkDetail`, `caseDetail`,
  `bugReport`) take the viewer.
- **`src/server/fns.ts`** — added `requireViewer()` (signed-in, CLI user not required) for the read
  server functions; edit server functions keep `requireUser()` (member, non-null id).
- **`src/server/production-errors.ts`**, **`src/server/ticket-links.ts`** — every edit path
  (decideProblem, save/removeDestination, saveSlack, platformTargets/People, attach/removeTicket) now
  uses `memberProject`, so a domain-group viewer cannot change anything.
- **`src/routes/api/cli/bugs.ts`** — the CLI's reads pass the person as the viewer (reads only; linking
  stays member-only through the edit paths).
- **`scripts/admin.ts`** — `group:add <project> <domain>` / `group:remove <project> <domain>`; `list`
  shows person memberships and domain groups separately.
- **`src/routes/_app/p/$project/checks/$check/index.tsx`** — a **Copy link** button in the check header
  copies the current run's absolute URL, pinned with `?run=<id>` so it always opens that exact run.
- Charter (engineering.md, product.md, operations.md incl. new redline 11) and README updated under the
  owner's standing charter-edit authorization and this ticket's request.

## AC results

Verified on the ticket port (63055) signed in as the sandbox account, plus a read-only server script
(`tmp/verify.ts`) that exercises the real access SQL, and the admin CLI.

1. **Domain group can view — passed.** With `group:add assc-share-55 example.com` and the signed-in
   account NOT a member of that project, `/p/assc-share-55` loaded (HTTP 200); the script confirms both
   an id-bearing non-member and a pure-domain viewer (no user row) get the project.
2. **Outsiders 404 — passed.** Before the group was added the same account got HTTP 404 on
   `/p/assc-share-55`; the script confirms a non-matching domain returns null.
3. **Domain group read-only — passed.** The script shows `memberProject(id, 'assc-share-55')` is null
   for the domain viewer, so every edit server function returns 404 for them.
4. **Members unchanged — passed.** The script shows a sandbox member keeps both view and edit; the
   member's sandbox pages load as before and its 2 memberships are untouched.
5. **Copy link — passed.** The button is present on the check header (desktop and phone, no overflow);
   `navigator.clipboard.writeText` succeeds in a secure context; the pinned URL `?run=83` opens exactly
   run #83.
6. **Not signed in — passed.** `/p/assc-share-55` while signed out redirected to
   `/login?redirect=%2Fp%2Fassc-share-55`.
7. **CLI — passed.** `group:add` and `group:remove` add/remove the domain group; `list` shows it under a
   separate table; after `group:remove` the domain can no longer view and the placeholder user is tidied
   (no bare-domain users left).

Mechanical defence (`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`): passed, 80 tests.
Ant lint: no failures.

## Deviations

- The plan's `project_domains` table was dropped for the memberships-based design at the owner's request
  ("按memberships来，何必建新表"). This also removed the migration entirely, so no production schema change.
- The plan said the CLI stays member-only for reads; in practice a person's CLI reads use the same viewer
  rule as the web (reads only), which is more coherent. Linking/editing via CLI stays member-only.

## Environment

- Port: web 63055. No env keys added, changed or removed. No migration.

## Residual

- The `users` table now can hold bare-domain placeholder rows; `user:add`/`user:remove`/`list` still
  operate on them if named directly. Managed normally through `group:*`.

## Check (for the human)

1. The **Copy link** button on a check page (e.g. http://localhost:63055/p/sandbox/checks/prod): is this
   the right placement and label for "share this run"?
2. Whether domain-group projects should also appear in a viewer's project switcher (they do now), or only
   open via a pasted link.

## Decided for you

- Domain groups reuse `memberships` via a bare-domain placeholder user; no new table, no migration.
- Domain group is read-only; editing (tickets, automation, Slack) stays member-only.
- Domain match is exact and case-insensitive; no subdomain wildcards.
- The copy link pins `?run=<id>` so it always opens that run, not whatever is latest later.
- A person's CLI reads follow the same view rule as the web; CLI linking stays member-only.
- operations.md gains redline 11: adding a domain to a real project (nsdk/bf/customer) needs the owner's approval.
