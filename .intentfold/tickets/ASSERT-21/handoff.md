# ASSERT-21 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

- README "Administration" names both sign-in methods: an email code or Google.
- operations.md lists the five DNS-only CNAMEs that the Clerk production instance needs in the
  `assertchecks.com` zone, and the post-deploy check now includes `/privacy`.
- `src/server/session.ts`: the comment on the verified-email check names both sign-in methods. The
  code is unchanged.
- Local clean-up: the scratch files from ASSERT-7 to ASSERT-20 are deleted. A scan found no keys in
  them first.

## AC results

1. **Sign-in wording matches the live site — passed.** README, engineering.md and the session comment
   all say an email code or Google. No other mention of passwords, the old session cookie or the old
   shared mailbox remains in the README, the charter, `src` or `scripts`.
2. **Post-deploy check — passed.** The updated command, run against production, returned 200 for `/`,
   `/login`, `/privacy`, both schemas paths and the default hostname. The deployed commit equals
   `origin/main` (57b570b).
3. **Nothing left behind — passed.** After merge, only `main` exists locally and on GitHub, with no
   extra worktree and no local server. The database has no ticket test data. The Clerk development
   instance has one user, the owner's own sign-in. Typecheck and 38 unit tests pass.

Two items are left for the owner on purpose, because deleting them cannot be undone:
- the disabled Google client secret ending `tdFS`;
- the unused default secret keys that Clerk created with each instance.
