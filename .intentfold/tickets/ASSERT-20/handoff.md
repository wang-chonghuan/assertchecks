# ASSERT-20 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## Decisions (owner, 2026-10-19)

- assertchecks.com keeps the Clerk production instance from ASSERT-17. Local development can only
  use the development instance, because the production instance works only on assertchecks.com.
- Google sign-in is added on both instances. Production uses the owner's own OAuth client. The
  development instance uses Clerk's shared development credentials.
- The Google consent screen uses the owner's Google account email as support and developer contact,
  and the app is published to production. The owner accepted Google's API user data policy.
- Google requires a public privacy page before publishing. Its contact is the same email.

## What changed

- **Google Cloud** project `assertchecks-auth` (AssertChecks), the same pattern as SkatGo's
  `skatgo-auth`:
  - External OAuth consent screen named AssertChecks, with only the openid, email and profile
    scopes.
  - Web client "AssertChecks Clerk production": origin `https://assertchecks.com`, redirect
    `https://clerk.assertchecks.com/v1/oauth_callback`.
  - The first client secret was exposed in a tool transcript while it was being copied. It was
    disabled at once, and a second secret, never displayed, is the one stored in Clerk. Deleting the
    disabled secret cannot be undone, so it is left for the owner.
- **Clerk**: Google enabled for sign-up and sign-in on both instances; production has the custom
  client ID and secret. Email codes stay; passwords stay off.
- **Site**:
  - `/privacy`: a public page, linked from the homepage footer, stating what is stored, cookies,
    hosting and the contact.
  - `/login` copy changed from "Sign in with your email" to "Sign in".
  - `clerkAppearance` gives the Google button the pill shape and the 16/24 type.
- **Code**: no change to access. `session.ts` already maps the verified primary email whatever the
  sign-in strategy, and Google emails arrive verified.
- **Charter**: engineering.md names both sign-in methods, the Google project, and the public privacy
  page.

## AC results

See the Plane ticket for the production checks after deploy. Locally (production build on 63020,
development instance):
- `/login` shows "Continue with Google" above the email form.
- Clicking it reaches Google's account chooser with scopes openid, email and profile.
- `/privacy` and the footer link render.
- Typecheck, 38 unit tests, the build and antd lint pass.

Completing a Google sign-in needs a real Google account and is left to the owner.
