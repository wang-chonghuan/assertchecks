# ASSERT-20 acceptance checks

## AC1 Production offers Google and email codes
Check: `https://clerk.assertchecks.com/v1/environment` (Google enabled, email code the only email factor,
password off); https://assertchecks.com/login in a browser.
True when: the page uses the production key (`pk_live`, no development badge) and shows "Continue with
Google" above the email form.

## AC2 Google consent shows AssertChecks on assertchecks.com
Check: click "Continue with Google" on https://assertchecks.com/login.
True when: Google's page belongs to the `assertchecks-auth` client with redirect
`https://clerk.assertchecks.com/v1/oauth_callback`, scopes openid/email/profile, and names AssertChecks;
the Google app is published (not Testing).

## AC3 Access rules unchanged
Check: code review of `src/server/session.ts` (identity is the verified primary email whatever the
strategy); the owner signs in with Google on production.
True when: no code path depends on the sign-in strategy; the owner's Google sign-in lands on their
projects.

## AC4 Privacy page, charter, checks
Check: `/privacy` and the homepage footer link; `charter/engineering.md`; typecheck, test, build, antd
lint; post-deploy check.
True when: all pass and the page states what is stored, cookies, hosting and the contact.
