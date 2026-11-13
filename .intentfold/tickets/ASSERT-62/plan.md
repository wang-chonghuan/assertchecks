# ASSERT-62 plan — show escalation call/notice details on the Alerts tab

Owner directive (2026-11-13): the Alerts tab's "Active alerts" card must show the per-stage
notification/call details for each active escalation, so an on-call drill (FU-03 / Drata) can be
screenshotted straight from the page. Develop and deploy immediately; no questions.

## Approach

The detail already exists in `ticket_escalations.log` (jsonb, append-only:
`{ stage, kind: 'slack'|'call', ok, detail, at }`; `detail` for a call is the Twilio **Call SID**, an
identifier, not a credential). ASSERT-57 deliberately did not surface it. This ticket surfaces it,
read-only, keeping the DTO secrets-free (no Twilio credentials, no phone numbers, no emails).

1. `src/lib/types.ts` — add `AlertNote { at; stage; kind; ok; detail }` and `notes: AlertNote[]` to
   `AlertItem`.
2. `src/server/escalation.ts` — `onCallSummary` selects `log` and maps it to `notes` (validated,
   oldest first). No new query surface, no secrets.
3. `src/components/oncall-alerts.tsx` — under each active alert, render its notes: stage→role
   (Primary/Backup/Final), kind (Slack/Call), time, ok/failed, and the Call SID for calls.
4. `tests/` — a small unit test for the log→notes parser (pure).

## Not in scope

No change to the escalation engine, the timer, severity, or any ASSERT-56/57 behaviour. No new
dependency. Additive only; no migration (the `log` column already exists from 013).
