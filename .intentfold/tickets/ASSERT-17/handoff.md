# ASSERT-17 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## Decisions (owner, 2026-10-19)

- Clerk only proves who owns an email. Which projects an email sees is still set only with the CLI
  (`user:add`, `member:add`); an email the CLI never added can sign in but sees no project.
- Password sign-in is removed entirely; Clerk is the only way in.
- The shared support mailbox account is replaced by the owner's own email. The owner's email is
  not written into this public repository; the shared mailbox is removed from the old ticket
  records as well.
- Production uses a Clerk production instance on assertchecks.com; local development uses the
  development instance.
- The sign-in screen is Clerk's `<SignIn>` component themed from `ASSERTCHECKS_STYLE`.
- The new dependency `@clerk/tanstack-react-start` 1.7.3 and the Clerk keys are approved by the
  owner's request in this ticket.

## What changed

- **Clerk application** `assertchecks` in the owner's workspace beside Skatgo and Risetive. Both
  instances allow only email + verification code: password, email links, phone, username and all
  social connections are off.
- **Production instance** on `assertchecks.com`, created by cloning the development settings. Its
  five DNS-only CNAMEs (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`) are in
  the Cloudflare zone, and Clerk reports all of them verified.
- **Request middleware** (`src/start.ts`): `clerkMiddleware()` plus TanStack Start's CSRF check for
  server functions. TanStack drops its default CSRF check once this file exists, so it is added
  back here.
- **Session** (`src/server/session.ts`): `auth()` gives the Clerk user, and its verified primary
  email is looked up in `users`. The email is cached per process; the users table is read on every
  request, so membership changes apply at once. A user without a row gets `id: null`, which
  `me()` turns into no projects and `requireUser()` into a 404 for every project page.
- **Removed**: password checking and hashing, the cookie session, and the `login`/`logout` server
  functions. `pnpm admin user:password` is gone too, and `user:add` no longer generates a password.
- **Pages**: `/login` renders `<SignIn routing="hash" withSignUp>`, which lands on `/p` after
  sign-in or sign-up. The header's sign-out button calls Clerk's `signOut()` and returns to
  `/login`. `ClerkProvider` wraps the app with `clerkAppearance` from `src/theme.ts`.
- **Migration** `003_clerk_sign_in.sql` makes `users.password_hash` nullable. Under engineering
  redline 4, the now-unused `password_hash` column and `sessions` table stay until a later
  migration, after this deploy.
- **Keys**: both are read at runtime (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), so the image
  bakes nothing in. Development keys are in the git-ignored `.env`. The production secret key is
  Container App secret `clerk-secret-key`.
- **Docs**: README (environment, administration) and charter drafts in `engineering.md` and
  `operations.md`; see "Charter".

## AC results

Production build on port 63017, built-in browser with a session of its own, development instance,
Clerk test emails (`+clerk_test`, code 424242).

1. **Clerk application, email codes only — passed.** The dashboard shows `assertchecks` in the
   Personal workspace beside Skatgo and Risetive. On both instances: Email has sign-up and sign-in
   on verification code with links off, Password has both switches off, Phone and Username are off,
   and SSO connections lists none.
2. **Signed-out project pages go to sign-in — passed locally.** `/p` and `/p/nsdk` answer 307 to
   `/login`. `/login` shows the themed Clerk email form at 1440 and 390 wide (`scrollWidth` 390), and
   `/` answers 200. Production is checked after deploy.
3. **A member email sees only its projects — passed.** A test email added with `user:add` and
   `member:add assert-17-test` signs in with the code and lands on `/p/assert-17-test`. The project
   switcher lists only that project, and `/p/nsdk` and `/p/bf` show "Not found".
4. **A non-member email sees nothing — passed.** Two test emails the CLI never added signed up with
   the code and landed on `/p`, which shows "No projects yet". `/p/assert-17-test`,
   `/p/assert-17-test/smoke` and `/p/nsdk` all show "Not found".
5. **Sign-out — passed.** The header button returns to `/login`, and `/p/assert-17-test` then
   redirects to `/login` again. The homepage stays public.
6. **Owner account and passwords removed — partly passed.** The repository no longer contains the
   shared mailbox, and no password sign-in path remains. Moving the owner's projects to the owner's
   email is done at deploy (add the new user and its memberships, then remove the old one), so
   production is never left without a working owner sign-in.
7. **Checks and clean-up — passed.** `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
   `assert-17-test` and its test user are removed with the CLI, the three Clerk test users are
   deleted through the Backend API (the development instance has 0 users), and the dev servers are
   stopped.

A first sign-up landed on `/` instead of `/p`. With `withSignUp`, a new email goes through the
sign-up branch, which has its own redirect, so `signUpFallbackRedirectUrl="/p"` was added.

## Charter

`engineering.md` and `operations.md` are updated; the owner approved them with the merge request:
- Identity comes from Clerk, and access only from CLI users and memberships matched by verified
  email.
- No passwords or sessions are stored.
- `src/start.ts` is added to the structure.
- New environment keys, including the `clerk-secret-key` secret.
- Acceptance uses Clerk test emails on the development instance and deletes them afterwards.
- Redline 8 now names the Clerk secret key instead of user passwords.

## Follow-ups

- A later migration drops `users.password_hash` and the `sessions` table.
- The dashboard suggests adding a second email provider for deliverability. It is optional and was
  not done.
