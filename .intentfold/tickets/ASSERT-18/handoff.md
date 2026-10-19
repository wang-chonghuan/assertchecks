# ASSERT-18 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

- **Clerk display name**: the `assertchecks` application is renamed `AssertChecks`. The name is set
  per application, so both instances use it and the sign-in card reads "Continue to AssertChecks".
- **Migration** `004_drop_passwords_and_sessions.sql` drops the `sessions` table and the
  `users.password_hash` column. ASSERT-17, which stopped using both, is already deployed, so engineering
  redline 4 is met. No code referred to either.
- **Users**: six colleagues' @narrativebanking.com emails were added with `pnpm admin user:add`,
  each a member of `nsdk` and `bf`. They sign in with an email code. Their addresses are listed only
  in the Plane ticket, not in this public repository.

## AC results

1. **Clerk display name — passed.** The production Frontend API returns `AssertChecks` as
   `display_config.application_name`, and the dashboard shows the same name on the development
   instance.
2. **Drop migration — checks pass; applied at deploy.** `pnpm typecheck`, `pnpm test` (38 passed)
   and `pnpm build` pass. Per operations, the migration and the post-deploy check run from the merged
   `main`, and their results are recorded on the Plane ticket.
3. **Six colleagues — passed.** `pnpm admin list` shows the six emails, each with `nsdk` and `bf`,
   and no other change.
