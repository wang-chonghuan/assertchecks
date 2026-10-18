# ASSERT-7 acceptance checks

## AC1 Signed-out visitors land on the homepage

Check: in a fresh browser context with no session, open `/` at 1440×900.
True when: the URL stays `/` (no redirect to `/login`) and the page shows the hero, the three
judgements (on time, complete, correct), the four connection steps, the report format and the
"what it does not do" section.

## AC2 The entry button depends on sign-in

Check: signed out, the hero's primary button leads to `/login`. Sign in as a ticket-scoped test
user who belongs to a ticket-scoped project; open `/` again.
True when: signed in, `/` still shows the homepage and its primary button opens that user's last
opened project; signing in from `/login` also lands in the project, not back on the homepage.

## AC3 Every command on the homepage is accepted by the client

Check: run each `node assertchecks.mjs ...` command shown on the homepage with the client served
by the local server, a fake token and `ASSERTCHECKS_ORIGIN` pointed at the local server.
True when: every command gets past argument parsing and fails only at the server with the
unknown-token 404, i.e. no "Unknown option" or usage error.

## AC4 Mobile, colour scheme and production

Check: at 390×844 measure `document.documentElement.scrollWidth` against the viewport width; view
the page with the browser emulating `prefers-color-scheme: dark`; after deploy, open the production
root.
True when: no horizontal page scroll on mobile; text is readable in both schemes (the site is
light-themed, so dark emulation must not produce unreadable mixed colours); production `/` shows the
homepage and contains no project data.
