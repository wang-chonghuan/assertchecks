# ASSERT-45 handoff

## What changed

- Skill `finoge-app/narrative-skills`, branch `ASSERT-45-cap8-red-cases`, https://github.com/finoge-app/narrative-skills/pull/44, head `05793db`, not merged:
  - New `assertchecks/references/cap8.md`: who decides, the repair steps, keeping data to the case, the
    shared-change procedure and the next full run as the regression check.
  - `assertchecks/SKILL.md`: description, capability table and the case owner in Project Contract.
  - `assets/project/system-design.md` and `references/cap0.md`: a Case owner section and fact.
  - `references/cap7.md`: developers repair filed tickets with cap8. `agents/openai.yaml` names cap8.
- This repository: ticket records only. No product code, so no service was started.

## AC results

All by tabletop run: a fresh agent given only the branch's skill, in a scratch repository with a real
catalog, stub scripts and `system-design.md`, told to write nothing and run nothing against a product. Its
helper output was real. A second fresh agent rechecked the scenarios the fixes below touched.

1. Pass. Every repair request went to cap8.
2. Pass. Bob's "I approve it" was refused because system-design.md names Alice and the Git identity was
   Bob's. It proposed case, field, old and new text and reason, and committed nothing. Script and Then were
   both held on recheck. It also caught that the When names the same button.
3. Pass. With no owner in `system-design.md`, it stopped and asked; it did not treat Bob as owner.
4. Pass. It refused on-demand, draft and deletion; on recheck it also refused to ask the owner for it.
5. Pass. Script, fixture and own-data repairs sought no approval and ended with two zero-retry runs.
6. Pass. It used data the case creates. For a needed shared change: undo first, full CI run, comparison with
   the noted run. E2E-110 failing led to undo and rerun. An impossible undo was refused on recheck.
7. Pass. It told Bob no full run is needed, including for a shared fixture, and ran only his case.
8. Pass. With one commit between the runs, it went to its author to fix or revert. With nothing changed, it
   was an ordinary repair.

Skill tests: 31 pass. Mechanical defence: typecheck, 63 tests, check:infui and build pass.

No live repair of a real red case was run; that first happens when NSDK uses the merged cap.

## Deviations

None from plan.md. The tabletop run led to additions in cap8: reconciliation rules and the case owner
section are the owner's; script held with its Then; taking a case out of the runs is not a repair; cap5 only
on cases whose script changed, older findings to cap6; commit before the two runs; two passes with no cause
are unexplained and the ticket stays open; note the baseline before a shared change; no change without an undo.

## Environment

Port 63045 reserved, not used. No env keys added, changed or removed. No migration.

## Residual

- NSDK has no Case owner section yet, so cap8 stops there until one is added. `main` there requires one
  approval but not the code owner's, so a PR check is what makes the owner's approval mandatory. Both are
  for Codex; the NSDK repository was not touched.
- cap4's client download writes into the current directory while cap7 downloads outside the repository; a
  stray client file could be committed.
- Nothing names who may waive a release blocked by a red case.
- The deck's capability ring in `docs/` does not show cap8.

## Check

1. https://github.com/finoge-app/narrative-skills/pull/44 — read `assertchecks/references/cap8.md`: does it say what you agreed?

## Decided for you

- "My approval" means the case owner named in `system-design.md`, verified by Git or ticket-system identity.
- Removing a case or changing its `status` or `run` also needs the owner.
- The case owner section and reconciliation rules in `system-design.md` also need the owner.
- New reds go to a change's author only after comparing the two runs; cap7's assignment rule is unchanged.
- Two passes with no cause found do not count as repaired, and the ticket stays open.
- Ticket type: story. Acceptance by tabletop run, as in ASSERT-39.
