# ASSERT-62 acceptance

- **AC1** — On bf's Alerts tab, each active (unacknowledged) escalation in "Active alerts" shows its
  stage-by-stage notification/call attempts beneath it: role (Primary/Backup/Final), kind (Slack/Call),
  time, whether it was placed, and the Twilio Call SID for calls. Source: `ticket_escalations.log`.
- **AC2** — The DTO stays secrets-free: no Twilio credentials, no phone numbers, no emails (a Call SID
  is an identifier, not a secret). The tab still renders only for a project with alert configuration
  (ASSERT-57 behaviour unchanged).
- **AC3** — Mechanical defence green: `pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`.

## Evidence

- AC3: typecheck clean; 95 unit tests pass (incl. 2 new `parseAlertLog` tests); check:infui reports no
  violations; build succeeds.
- AC2: `parseAlertLog` only ever emits `{at,stage,kind,ok,detail}` where detail is a SID or a role; the
  SELECT adds only `log` to the existing secrets-free query; unit test covers drop-unknown and non-array.
- AC1: verified live on production after deploy against bf's own escalation rows (owner screenshots).
