# ASSERT-57 rework

Reconstructed at close from the diff since the frozen `handoff.md` (29d5670). Two owner-requested
rounds, one commit each; `handoff.md` was not edited.

## Round 1 — dedicated Alerts tab + alert-policy card (3fd6a73)

**Owner asked:** the on-call & alerts content should not sit atop the Production errors tab. Make it a
dedicated **Alerts tab**, and show **BF real data, not a sandbox demo**. Beside the on-call list, add a
small **alert-policy card** stating, for ordinary alerts, who handles urgent and critical, in what time,
how to handle (reply on the ticket), and how escalation proceeds.

**What changed:**
- `src/routes/_app/p/$project/index.tsx` — the card moved out of the Production errors tab into its own
  `Alerts` tab (`?tab=alerts`), pushed into the tab list only when the project has alert configuration.
- `src/server/queries.ts` — `overview()` now returns `alerts: boolean` (EXISTS on `alert_config`) so the
  tab shows only for a configured project (BF).
- `src/lib/types.ts` — `Overview` gained `alerts: boolean`; `OnCallAlerts` gained a secrets-free `roles`
  field (names only, no phone or email) for the policy card.
- `src/server/escalation.ts` — `onCallSummary` now returns the `roles` names.
- `src/components/oncall-alerts.tsx` — added the "Alert policy" card beside "On call"; low/urgent/critical,
  who handles each, acknowledge by replying on the ticket, how escalation climbs.
- The sandbox test `alert_config` added only for the first review was removed; verification is against BF's
  real configuration.

**Rechecked:** the Alerts tab renders only for BF (configured) and is absent for an unconfigured project;
the DTO carries no Twilio secrets, phone numbers or emails; on-call weeks and active alerts read BF's real
rows. Browser-verified against BF.

## Round 2 — acknowledgement targets on the policy card (df89065)

**Owner asked:** the policy card did not state critical's required acknowledgement time — is it 15 minutes
or one hour?

**What changed:**
- `src/components/oncall-alerts.tsx` — the policy card now states the acknowledgement targets: critical
  within **30 minutes**, urgent within **one working hour**. (15/30 min remain the escalation ladder steps;
  30 min is the overall human-acknowledgement target, per the owner's ASSERT-56 decision.)

**Rechecked:** the policy card shows both acknowledgement targets; copy matches the ASSERT-56 escalation
design. Browser-verified against BF.

## Net effect vs frozen handoff

The on-call & alerts content is now a dedicated, configuration-gated Alerts tab (BF only) carrying two
cards side by side — On call and Alert policy — above the Active alerts list, all from a secrets-free DTO.
No change to the escalation engine or any ASSERT-56 behaviour.
