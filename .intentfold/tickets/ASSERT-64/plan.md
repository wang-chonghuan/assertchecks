# ASSERT-64 plan — Active alerts → Alerts history

## Problem

The Alerts tab's "Active alerts" card lists only unacknowledged escalations (`confirmed_at IS NULL`),
so once an escalation is acknowledged it disappears and past alerts can't be reviewed.

## Approach

Turn the card into an escalation **history** that shows both states, matching the existing UI.

1. **Server (`onCallSummary`, `src/server/escalation.ts`)** — drop the `confirmed_at IS NULL` filter so
   the query returns every escalation for the project, add `confirmed_at` to the select, keep
   `ORDER BY created_at DESC`, and bound it with `LIMIT 50` so the card stays light as history grows.
   Map each row's `confirmedAt` (ISO or null).
2. **Type (`AlertItem`, `src/lib/types.ts`)** — add `confirmedAt: string | null`. Only the time is
   carried, never the acknowledger's email, so the DTO stays free of PII (consistent with the card's
   existing "names only, no email" rule).
3. **Component (`src/components/oncall-alerts.tsx`)** — card title → "Alerts history"; empty state →
   "No alerts yet"; each row keeps its severity tag and gains a status tag — `Active` (processing/blue)
   while unacknowledged, `Acknowledged` (default/grey) once confirmed — and the caption shows
   `opened <time>` plus `· acknowledged <time>` when confirmed. Notes (stage details) render unchanged.

One chronological list, newest first; the status tag distinguishes active from acknowledged. Uses only
Ant Design + `src/infui` tokens already in the file — no new tokens, colours or layout primitives.

## Out of scope

- No change to how escalations are created, acknowledged or escalated.
- The acknowledger's identity is not surfaced (avoids email PII).
