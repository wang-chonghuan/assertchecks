# ASSERT-64 handoff — Active alerts → Alerts history

## What changed

The Alerts tab's bottom card now shows escalation **history** (active + acknowledged), not only active.

- `src/server/escalation.ts` — `onCallSummary` drops the `confirmed_at IS NULL` filter, selects
  `confirmed_at`, keeps `ORDER BY created_at DESC`, and bounds the result with `LIMIT 50`. Each alert
  maps `confirmedAt` (ISO or null).
- `src/lib/types.ts` — `AlertItem` gains `confirmedAt: string | null`. Only the time is carried, never
  the acknowledger's email, so the DTO stays PII-free.
- `src/components/oncall-alerts.tsx` — card title "Alerts history"; empty state "No alerts yet"; each row
  keeps its severity tag and gains a status tag (`Active` = processing/blue, `Acknowledged` = default/grey);
  the caption shows `opened <time>` and `· acknowledged <time>` when confirmed. Notes unchanged. Uses only
  the Ant + `src/infui` primitives already in the file — no new tokens, colours or layout.

## Verification

- Mechanical defence green: `pnpm typecheck`, `pnpm test` (95 pass), `pnpm check:infui`, `pnpm build`.
- Data proof against the deployed shared DB: the new history query for bf returns both FU-03 drill
  escalations, each `Acknowledged` with its notes, newest first — rows that the old `confirmed_at IS NULL`
  filter hid. (No active escalations exist right now, as expected.)

## Notes

- No migration (reads an existing column), no new dependency.
- The acknowledger's identity is intentionally not surfaced (email PII); only whether/when acknowledged.
