# ASSERT-17 acceptance checks

## AC1 Clerk application with email codes only
Check: the Clerk dashboard for application `assertchecks` (development and production instances):
User & authentication, Email and Password tabs, and the social connections list.
True when: the application sits in the owner's workspace beside Skatgo and Risetive; sign-in and
sign-up use the email verification code only; password, links, phone, username and every social
connection (Google included) are off.

## AC2 Signed-out project pages go to sign-in
Check: production build on the ticket port and, after deploy, https://assertchecks.com; a fresh
browser session opens `/p`, `/p/<project>` and a check page.
True when: each lands on `/login`, which shows the Clerk email sign-in in the site's theme; `/` stays
public and renders without signing in.

## AC3 A member email sees only its projects
Check: ticket-scoped project `assert-17-test` with one check, ticket-scoped Clerk test email
(development instance, `+clerk_test` address) added with `pnpm admin user:add` and `member:add`; sign
in with the emailed code in the browser.
True when: after the code, the browser lands on `/p/assert-17-test`; the project switcher lists only
that project; `/p/nsdk` and `/p/bf` return the not-found page.

## AC4 A non-member email sees nothing
Check: a second ticket-scoped Clerk test email that the CLI never added; sign in; open `/p`,
`/p/assert-17-test`, `/p/nsdk`.
True when: `/p` shows "No projects yet" and every project URL returns the not-found page.

## AC5 Sign-out
Check: the header sign-out button, then `/p/assert-17-test` again.
True when: sign-out lands on `/login` and the project page requires signing in again.

## AC6 Owner account and passwords removed
Check: `pnpm admin list`; a search of the repository for the old shared mailbox; the source for
password sign-in.
True when: the owner's projects belong to the owner's own email named in the request (not written
into this public repository), the old shared mailbox is gone from the database and the repository,
and no password sign-in path remains (the unused
`password_hash` column and `sessions` table are left for a later migration, per engineering
redline 4).

## AC7 Mechanical checks and clean-up
Check: `pnpm typecheck && pnpm test && pnpm build`; `pnpm admin list`; the Clerk development
instance's Users page.
True when: all pass; no ticket-scoped project, user or Clerk test user remains.
