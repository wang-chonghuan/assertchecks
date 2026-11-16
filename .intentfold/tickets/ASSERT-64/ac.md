# ASSERT-64 acceptance checks

1. **History card.** On https://assertchecks.com/p/bf → Alerts tab, the bottom card is titled
   "Alerts history" and lists both active (unacknowledged) and acknowledged escalations, newest first.
2. **Status is clear per row.** Each row shows its severity tag plus a status tag: `Active` while
   unacknowledged, `Acknowledged` once confirmed; the caption shows `opened <time>` and, when
   acknowledged, `· acknowledged <time>`.
3. **Past alerts visible.** The two FU-03 drill escalations (acknowledged, linked to ENG-1897/ENG-1898)
   now appear, marked Acknowledged — they were hidden before this change.
4. **Empty state.** A configured project with no escalations shows "No alerts yet".
5. **No PII in the DTO.** The response carries no phone number, email or credential (the acknowledger's
   email is not surfaced).
6. **Mechanical defence green:** `pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`.
