# ASSERT-70 handoff — release branch and commit SHA on each report

## What changed

Each security report showed the version as a link but never the commit SHA as text, and the release
branch was never captured, so from the overview the SHAs looked missing. Reports now show the branch
and the full commit SHA, and the page and the Markdown stay in sync.

- `db/migrations/016_security_report_ref.sql` — additive `branch` and `commit_sha` columns (nullable).
- `src/lib/types.ts` — `SecurityReport` gains `branch` and `commitSha` (string | null).
- `src/server/queries.ts` — select and map both columns on all three report reads.
- `scripts/admin.ts` — `security:add` accepts and upserts `branch` and `commit_sha`.
- `src/components/security.tsx` — report metadata gains a **Branch** row and a **Commit** row (short
  SHA linked to the commit); Version is now plain text.
- `src/lib/security-report.ts` — Markdown header table gains **Branch** and **Commit** rows.
- Data (owner-directed, like prod-live): bf (11), nsdk (19), sandbox (2) re-seeded with the real branch
  (`release/x.y.z` where it exists, else `main`) and full SHA, all verified against live tags.

## Verification

- Mechanical defence green: `pnpm typecheck`, `pnpm test` (95 pass), `pnpm check:infui`, `pnpm build`.
- Markdown header renders `| Branch | release/1.9.1 |` and a linked `| Commit | 5aed07b41610 |`.
- Branch resolution cross-checked: nsdk 1.8.4/1.8.5/1.8.7/1.8.8/1.8.9/1.9.1 → `release/x.y.z`; all
  other bf and nsdk releases → `main`.

## Notes

- No new dependency. Findings remain low-severity representative content; real CI output is ASSERT-67.
