# ASSERT-18 acceptance checks

## AC1 Clerk display name
Check: `curl -s https://clerk.assertchecks.com/v1/environment | jq -r .display_config.application_name`,
and https://assertchecks.com/login in a browser.
True when: the name is `AssertChecks` and the sign-in card reads "Continue to AssertChecks".

## AC2 Unused password column and sessions table dropped
Check: after `pnpm migrate`, `information_schema` for `users.password_hash` and the `sessions` table;
`pnpm typecheck && pnpm test && pnpm build`; the post-deploy check in `charter/operations.md`.
True when: neither exists, all checks pass, and the deployed commit equals `origin/main`.

## AC3 Six colleagues added
Check: `pnpm admin list`.
True when: the six @narrativebanking.com emails named in the request exist, each a member of `nsdk`
and `bf` (the emails stay out of this public repository).
