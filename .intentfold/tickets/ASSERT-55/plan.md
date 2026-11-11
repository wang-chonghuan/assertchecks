# ASSERT-55 plan

## What the code already says

- The per-run URL already exists: `/_app/p/$project/checks/$check/?run=<n>` opens that finished run
  (`checkDetail`/`finishedRun`). So the "pasteable address per test" part needs no new routing — only a
  copy affordance.
- Access today: `project(userId, slug)` in `queries.ts` is the single choke point, a member-only join
  (`memberships`). It is used by **both** reads (overview, checkDetail, caseDetail, bugReport,
  productionErrors) and edits (ticket attach/remove in `ticket-links.ts`; decideProblem,
  saveDestination/removeDestination, saveSlack, platformTargets/People in `production-errors.ts`).
- `requireUser()` in `fns.ts` throws `notFound()` when the signed-in email has no CLI user row. So a
  colleague who was never added individually currently sees nothing, even by deep link.
- `me(user, remembered)` builds the project switcher list from memberships only.
- Downstream reads are scoped by **project id**, not user id, once `project()` returns the row — so a
  viewer with no CLI user row can still read everything by project id.

## Route

A viewer is authorised to **see** a project when they are an explicit member **or** their verified
email's domain is in that project's allowed domains. Editing stays member-only.

1. **Migration** `db/migrations/013_project_domains.sql` (additive): table `project_domains`
   (`project_id bigint REFERENCES projects(id) ON DELETE CASCADE`, `domain text NOT NULL`,
   primary key `(project_id, domain)`); domain stored lowercased without `@`.
2. **`queries.ts`**: rename the current member-only `project` to `memberProject(userId, slug)`. Add a
   new `project(viewer: { id: string | null; email: string }, slug)` that matches member **or** domain
   (`split_part(lower(email),'@',2)`). Reads switch to `project(viewer, ...)`; their signatures take the
   viewer instead of a bare `userId`. `me()` lists member projects **unioned** with domain-matched ones.
3. **`fns.ts`**: add `requireViewer()` (redirect to /login when not signed in, but allow a null CLI id)
   and pass the viewer to the read server functions (getOverview, getCheck, getCase, getBugReport).
   Edit server functions keep `requireUser()` (member, non-null id).
4. **`production-errors.ts`**: `productionErrors` (read) uses `project(viewer, ...)`; every edit
   (decideProblem, save/removeDestination, saveSlack, platformTargets, platformPeople) uses
   `memberProject(user.id, ...)`.
5. **`ticket-links.ts`**: attach/remove use `memberProject(user.id, ...)`.
6. **`scripts/admin.ts`**: `group:add <project-slug> <domain>`, `group:remove <project-slug> <domain>`;
   `list` shows each project's allowed domains.
7. **Copy link**: on the check page, a "Copy link" control that copies the absolute URL of the run
   being viewed (with `?run=<n>` when not the latest).
8. **Charter** (owner's standing authorization): engineering.md access/scope decisions and product.md
   "see only the projects they belong to" extended to "member or the project's email-domain group
   (read-only)"; operations.md `## Tools` gains the group commands and a redline that adding a domain to
   a real project (nsdk/bf/customer) needs the owner's approval. ui.md component list if a component is added.

## Out of scope / decided

- The CLI client-token path stays member-only (it links tickets = editing); domain groups are web-view
  only. No change to `client-tokens.ts` or `api/cli/*`.
- Domain match is exact and case-insensitive; no subdomain wildcards.
- Domain-group projects also appear in the viewer's project switcher and `/p` list (consistent with
  being able to view them).

## Redlines checked (before code)

- product.md 1/2 (no code/credential storage, no telemetry writes): untouched — no new secret, no
  telemetry write. product.md 3 (edit product.md): standing approval 2026-10-21; this ticket is the
  authorization, recorded in a comment.
- engineering.md: additive migration only (one table), matches the one-database rule. No new library.
- operations.md 5 (production schema change needs approval): an additive migration named in this
  approved ticket's plan is part of its approval. Adding a new redline for domains is an owner-authorised
  charter edit.
- ui.md 1 (infui theme values): not touched; the copy control uses existing tokens/components only.
