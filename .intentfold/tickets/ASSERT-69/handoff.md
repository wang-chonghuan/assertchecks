# ASSERT-69 handoff — richer security reports

## What changed

Each report was thin (a one-line summary and one-line findings). Reports now read like a proper
security assessment, and the page and the Markdown stay in sync.

- `src/lib/types.ts` — `SecurityFinding` gains `impact` and `recommendation` (string | null).
- `src/lib/security-report.ts` — each finding renders as a block with *Impact*, *Recommendation* and
  *Reference*; the Markdown gains a **Scope & methodology** section, a **Remediation** section and a
  **Standards** section (OWASP ASVS + Top 10). The richer summary comes from the stored `summary`.
- `src/components/security.tsx` — `SecurityReportBody` now takes `project`, renders Scope & methodology
  after the summary, impact + recommendation on each finding (`Labelled`), and Remediation + Standards
  after the findings.
- `src/routes/_app/p/$project/security/$version/index.tsx` — passes `project` to `SecurityReportBody`.
- Data (owner-directed, like prod-live): the finding pool gained a realistic impact + recommendation per
  item, and the summary became 2–3 sentences; bf (11) and nsdk (19) reports were regenerated and
  re-seeded, sandbox (2) too.

## Verification (sandbox, redline 2)

- Mechanical defence green: `pnpm typecheck`, `pnpm test` (95 pass), `pnpm check:infui`, `pnpm build`.
- UI proof (signed-in browser): `/p/sandbox/security/b06652683479` shows the multi-sentence summary,
  Scope & methodology, each finding's Impact + Recommendation + Reference, Remediation and Standards.
- The `.md` download carries the same content (checked by generating it from the stored report).

## Notes

- No migration, no new dependency. Findings remain low-severity representative content; real CI tool
  output is ASSERT-67.
