# ASSERT-39 handoff

## What changed

- Skill `assertchecks/references/cap7.md` (finoge-app/narrative-skills#42, branch
  `ASSERT-39-cap7-closed-tickets`): "Existing tickets first" is replaced by "Existing tickets: never
  write to one" — a table on the case's newest ticket (none → file, or link to an open ticket of the same
  cause; open → nothing; closed and the run contains its fix → new ticket linking it; closed and not
  contained → nothing; cannot tell → list), with what "contains the fix" and "cannot tell" mean. The
  opening rule and the finish list now name the cases left with their ticket and the undecidable ones;
  "created or updated" became "filed or linked". 31 skill tests pass. Not merged.
- `src/lib/bug-report.ts`: the report's short form for an agent without the skill states the same rule
  and no longer asks for evidence on, or reopening of, existing tickets.

## AC results

1–5 — pass, by a tabletop run: a fresh agent with only the branch's skill, a scratch repository with
real commits (a product fix inside the run's deployed commit, one after it, a test fix equal to the run's
test commit), a ticket file standing in for the tracker, and a seven-case report; told to make no writes
and list them instead. It ran `git merge-base --is-ancestor` itself and decided:
- E2E-002, newest ENG-11 open → nothing (AC 1).
- E2E-003, ENG-12 closed, fix in the deployed commit → new ticket linking ENG-12, link back; E2E-006,
  ENG-15 closed, test fix is the run's test commit → new ticket linking ENG-15, link back (AC 2).
- E2E-004, ENG-13 closed, fix not in the deployed commit → nothing (AC 3).
- E2E-005, ENG-14 closed as duplicate with no fix → no ticket, listed as undecidable (AC 4).
- E2E-001, no ticket → new ticket, link back (AC 5); E2E-007, no ticket, open ENG-20 has the same cause
  → linked to ENG-20 without writing to it.
No existing ticket received a write.
6 — pass. On the ticket server (port 63039) the sandbox dev check's "Copy bugs" text — the same text
`bugs --check dev` prints — carries the new rule, and its instructions contain none of "Add evidence",
"new evidence", "reopening", "comment".

Mechanical defence: typecheck, 60 tests, build — pass.

## Deviations

None from plan.md.

## Environment

Port 63039. No env keys added, changed or removed. No migration.

## Residual

- The ten "already fixed" exclusions in the NSDK run came from another cap7 rule this ticket did not
  touch (Check 1).
- The seven comments Codex already wrote on closed NSDK tickets stay; they are harmless.

## Check

1. A case with no ticket may still be left out only when the newest run passed and a later commit
   changed its cause — that commit hunt is the same kind of work you just rejected. Simpler: no ticket
   and the newest run passed → skip, as AssertChecks already does not count it as a bug. This ticket did
   not change it; say if you want it.
2. https://github.com/finoge-app/narrative-skills/pull/42 — the new "Existing tickets" table in cap7.

## Decided for you

- An open newest ticket wins even when AssertChecks says "failed again after it had fixed it".
- A case with no ticket whose cause an open ticket already covers is linked to it without a comment.
- A case with no ticket whose cause a closed ticket covered gets a new ticket; the coverage check applies
  only to the case's own newest ticket.
- "Cannot tell": no recorded version, closed without a fix commit (cancelled, duplicate, won't fix), or no
  fix commit found.
- For a product fix, the deployed version compared is that of the component the fix changed.
