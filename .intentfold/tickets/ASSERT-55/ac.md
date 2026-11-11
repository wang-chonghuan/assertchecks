# ASSERT-55 acceptance checks

1. **Domain group can view.** With a domain added to the `sandbox` project for the signed-in sandbox
   account's email domain and that account NOT an explicit member, the check page and a specific
   `?run=<n>` run both load and show results. Checked by configuring via the CLI and loading the pages
   signed in; settled in the running product.
2. **Outsiders still 404.** A signed-in user whose email domain is not allowed and who is not a member
   gets the 404 on the same links. Checked by a server-side read with a non-matching viewer returning
   null (unit) and, where feasible, in the product.
3. **Domain group is read-only.** A domain-group viewer's edit attempts (attach/modify a ticket, change
   the automatic-ticket destination or Slack config) are refused server-side; the stored config is
   unchanged. Checked by calling the edit paths with a domain-only viewer and asserting refusal (unit).
4. **Members unchanged.** An explicit member keeps full view and edit, exactly as before this ticket.
5. **Copy link.** On the check page there is a control that copies the current run's absolute URL; the
   copied URL opened in a fresh session lands on the same run. Checked in the product.
6. **Not signed in.** Opening a share link while signed out redirects to /login.
7. **CLI.** `pnpm admin group:add`/`group:remove` add and remove an allowed domain, and `admin list`
   shows a project's allowed domains. Checked by running the commands.
