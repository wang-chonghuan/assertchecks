# ASSERT-12 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit. The owner asked for the Charter changes explicitly;
`product.md` is untouched because its own redline reserves it for the owner.

## What changed

- **`charter/engineering.md`**:
  - The structure lists the public homepage, the `check` dry-run route, `schema`, `catalog-changes`,
    `src/lib/connect-guide.ts`, `public/schemas/` and the client.
  - Key decisions now say that the report format's single definition is `public/schemas/*.json`,
    and that the homepage is public with no project data.
  - The generation entry covers `antd.dev.css` and `antd.css` and why they differ.
  - The push-API hotspot names schemas, README and connect guide together.
  - The landing "(review)" marker is resolved, and the seed note updated.
- **`charter/ui.md`**: "Where components live" names `brand.tsx` (the product mark),
  `check-summary.tsx`, `code-block.tsx`, and `styles.css` (structural rules only).
- **`charter/operations.md`**:
  - Test data is created and removed with the CLI, not hand-written SQL.
  - The post-deploy check covers `/`, `/login`, `/schemas/catalog.schema.json` and the client, and
    repeats while the previous revision still answers.
  - Headless browsing is allowed for checks that need their own session.
  - Test data is never attached to a real user and is removed as soon as the evidence is recorded.
  - The "(review)" marker is resolved and the seed note updated.
- **`scripts/admin.ts`**: `project:remove <slug> --confirm <slug>` (cascades to checks, runs and
  memberships through the existing foreign keys, and prints the counts) and
  `user:remove <email> --confirm <email>` (cascades to sessions and memberships). Each refuses and
  exits 1 unless the name is repeated.
- **`README.md`**: title "AssertChecks", an introduction matching the product, the homepage and
  published formats, the catalog-change notice, and the two removal commands.
- **`tests/connect-guide.test.ts`**: `agentPrompt()` must contain every step heading and text, every
  code sample (including the cases format), both format URLs, every call and the pass rule. The
  test derives all of these from the guide itself.

## AC results

1. **Charter matches the repository — passed.** All 26 plain paths named in the three files exist.
   The remaining backticked names were checked individually:
   - the globs `public/schemas/*.json` and `db/migrations/*.sql` match files;
   - `src/generated/antd.css` and `antd.dev.css` are produced by the two `pnpm antd-css` modes and
     are git-ignored;
   - the rest are a GitHub repository, an npm package and a Git ref.

   No "(review)" remains, and `git diff` shows `product.md` unchanged.
2. **Removal commands — passed.**
   - Setup: baseline 1 user, 3 sessions, 2 projects, 2 memberships, 3 checks, 5 runs. A throwaway
     `assert-12-test` project, check `c1`, a run (40, via the real start API), member
     `assert-12-tester@example.test` and one session row (inserted directly as test setup) raised
     each count by 1.
   - Refusals: `project:remove` without `--confirm`, with `--confirm nsdk`, and `user:remove` without
     confirmation each printed "refusing: …", exited 1 and changed nothing.
   - With confirmation, the project removal printed "removed project assert-12-test with 1 check(s),
     1 run(s) and 1 membership(s)" and the user removal took its session. Counts returned exactly to
     the baseline; the remaining data is support@, projects nsdk and bf, and checks
     nsdk/dev, local and prod.
3. **Post-deploy check — passed.** The command from `operations.md`, run against production in zsh
   and bash, returned 200 for `/`, `/login`, `/schemas/catalog.schema.json` and
   `/client/assertchecks.mjs`. The deployed commit `a5d4d7c` equals `origin/main`.
4. **Agent copy tested — passed.** `pnpm test` passes 35 tests. With the dry-run sample filtered
   out of `agentPrompt()` the new test failed ("Dry run"); the change was then restored.

Mechanical defence: typecheck, 35 unit tests and build passed.

## Deviations

- The first post-deploy command used `path` as the loop variable. In zsh `path` is tied to `PATH`,
  so it broke `curl`; the charter now uses `page`.
- AC2's session row was inserted with SQL as test setup, since sessions exist only through the
  browser sign-in. The removal itself used only the CLI.

## Environment

No ports, env keys or migrations. No production deployment is needed: nothing served changes
(the admin CLI runs locally).

## Residual

None.
