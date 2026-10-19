# ASSERT-24 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit. The decision it implements is seed ASSERT-23: allow
reconciliation recomputation inside end-to-end cases under three rules, with the earlier
"never recompute in E2E" idea recorded there as rejected.

## What changed (finoge-app/narrative-skills#25)

- **SKILL.md "Assertion Oracles"**: the one rule set used by cap1, cap4 and cap5.
  - Six allowed oracles: definite behavior, known value, own-action change, display equals source
    (display only), reconciliation, and a generated-content checklist.
  - Reconciliation is preferred for figures the product's value rests on, under three rules:
    people write the rule in `system-design.md`; there is one shared implementation reading the
    rawest source, with no arithmetic inside cases; and that implementation has a fixed-input
    test. A sentence forbids answering its risks by banning or moving recomputation.
  - Six defects are disallowed whatever the oracle: unchecked negative claims, vacuous passes,
    loose text matching, undecidable wording, code diverging from its Then, and expectations
    taken from current output.
- **cap4 (find)**: a read-only audit. For each Then it records the stated and actual oracle, the
  verdict, the defect class, the file and line, and the fix. Plain bugs and designer questions are
  recorded separately. The report starts with shared problems, is kept in ticket records rather
  than `assertchecks/`, and may be split across parallel reviewers that use the same rubric.
- **cap5 (fix)**:
  - Keeps coverage: no deletions, retirements, downgrades or weakened assertions. A newly
    exposed failure is recorded, not hidden.
  - Code-only fixes are the agent's to make. Catalog text and rule sentences go to the human as
    one batch of proposals.
  - Order: reconciliation, then negative claims, premises, text, per-case fixes and plain bugs.
  - Each changed assertion must be shown able to fail, then cap1's synchronization and the
    project's live-run rule apply, followed by a cap4 re-audit.
- **cap1** writes and implements Thens under Assertion Oracles. **cap0** asks for reconciliation
  rules and shared account state.
- **Templates**: `system-design.md` gains "Reconciliation rules" and "Shared account state", and
  `config.json` gains `expectedState` per environment.
- **agents/openai.yaml** lists cap4 and cap5.

## AC results

1. **Rules present, bound to no project — passed.** A search of the skill files finds no project
   name, account or project file. The only hits are the existing generic phrase "fingerprint
   ledger".
2. **cap4 from the skill text alone — passed.** A fresh read-only subagent was given only the new
   skill files. It audited ten NSDK cases whose defects an independent audit had already
   established.
   - **Agreements:**
     - E2E-007 stayed compliant.
     - E2E-055, 149 and 161 broke all three reconciliation rules. It also found, on its own, that
       four fixtures read the same transaction rows in different ways.
     - E2E-132 and 179 had unchecked negative claims (a late recorder and the wrong path).
     - E2E-016 and 050 had vacuous passes.
     - E2E-179's `/confirm/` pattern also matches "confirmed".
     - E2E-161's date comparison bug was found.
   - **Stricter than the earlier audit:** the control E2E-190 was marked partial. Its recorder
     path does not match the real plan-write endpoint, and its whole-object equality asserts more
     than the Then. Both points check out.
   - **Missed:** the E2E-153 "90 days" against the product template's "30 days" contradiction. It
     needs product source, outside a read-only case audit.
3. **Checks — passed.** The skill's 32 tests pass. Installation follows the merge.
