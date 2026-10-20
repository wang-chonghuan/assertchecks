# ASSERT-33 acceptance

Data: ticket-scoped project `assert-33` with check `dev`, fed NSDK's real run files (160-case
nightly result with 141 passed / 19 failed; a 21-case partial run) through the client. No `nsdk` or
`bf` data is written.

1. Card at 1440×900 and 390×844 shows the status, "19 failed of 160 run", a bar of ran cases only,
   and one "Ran …" line; no draft, manual or catalog-total count appears on the card body. The info
   popover shows trigger, schedule, partial run and cases outside the run.
2. Check page: tabs Failed (19) / Passed (141) / Not in this run (40); no All tab; failed rows show
   ID, title, unpassed Thens and the error's first line; full error in a collapsed row; Run details
   collapsed by default.
3. Case page for a failed case with a `failure` note shows the result and the cause above the spec;
   details collapsed.
4. `pnpm typecheck`, `pnpm test`, `pnpm build` and the antd lint pass.
