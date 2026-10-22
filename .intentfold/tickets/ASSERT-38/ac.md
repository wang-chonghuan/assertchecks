# ASSERT-38 acceptance checks

Local origin `http://127.0.0.1:63038`, client run with `ASSERTCHECKS_ORIGIN` set to it and
`XDG_CONFIG_HOME` pointing at a scratch directory, no `ASSERTCHECKS_PING_TOKEN`. The browser is signed
in as the sandbox test account. Data: project `sandbox` only.

1. **Login.** Run `login` in the background; it prints an address and code. Open the address in the
   browser, check the code matches, approve. The command exits 0 and prints the test account's email.
   True when: the printed output and the scratch repo contain no token (grep for the stored value),
   and the credentials file is mode 600 outside the repo.
2. **Expiry.** Start a login, age its row past 10 minutes in the database (sandbox account's own
   pending row), open the address: the page says it expired and offers no approve; the client exits
   non-zero saying the request expired.
3. **Report.** In a scratch repo with `assertchecks/config.json` `{"project":"sandbox"}`: `bugs` with no
   check lists sandbox's checks; `bugs --project` absent and no config lists the account's projects;
   `bugs --check dev` prints text identical to the dev check page's "Copy bugs" clipboard (read in the
   browser) for the same moment.
4. **Not a member.** `bugs --project nsdk --check dev` as the sandbox account: exits non-zero with not
   found and prints nothing of nsdk.
5. **Link.** `link --cases <a failing sandbox case> --ticket <the ASSERT-38 Plane URL>`: the case page
   shows the ticket, attached by the test account's email. A case ID not in any sandbox catalog is
   refused with its ID named, nothing recorded.
6. **Ping token cannot link.** `POST /api/ping/<sandbox dev token>/link` → 404; `check --catalog` with
   that token still validates as before.
7. **Logout.** `logout`, then `bugs` says not signed in; a direct `GET /api/cli/session` with the old
   token → 401.
8. **Skill.** A fresh agent in a scratch repo for `sandbox` (no ping token in its environment), given
   only "用 assertchecks cap7 为失败用例挂单", whose ticket rules say every case belongs to the existing
   ticket ASSERT-38 (read only, no comments): it fetches the report with the client itself and links
   the ticket back. True when the sandbox cases show the link by the signed-in account and the
   transcript shows no token.
