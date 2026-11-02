# ASSERT-45 rework

Against the frozen first delivery; skill head `4239d2c` on `finoge-app/narrative-skills#44`.

## Round 1

Ask: 你给的指令复杂化了，我们现在都是自动合并的，我建议采用事后审计的方式，但是其实我不知道脚本和用例描述如何互相绑定的，不改用例描述，只改脚本，让脚本漂移，其实我也不能知道

The PR check for NSDK was dropped. Added to cap5: an audit of changes since a commit, comparing each diff
with the Thens it implements.

## Round 2

Ask: 你决定吧，我的要求是，改完，别留尾巴，然后要用简洁有效的方法，不要复杂化，然后要移除技能里过时和矛盾的说法，不要往上糊东西，要去掉冗余保持一针见血

- The case owner is whoever `.github/CODEOWNERS` names, so no project file needs changing. The Case owner
  section and cap0 fact from the first delivery are gone. NSDK already names the owner.
- New `What A Case Says` in `SKILL.md` is the only statement of who owns case text and of not weakening a
  case; duplicates in cap1, cap2 and cap6 removed.
- Repair is only in cap8; cap3 runs and reports. cap8 reduced from 96 to 44 lines; its own audit step and
  helper check are gone because the daily change audit covers them.
- Contradictions removed: "first eligible object" against "never first"; cap4 and cap7 client downloads;
  cap7's acceptance against cap8's unexplained passes. Two-run rule stated once.
- Data rules repeated in cap2 and cap3 live once in `SKILL.md`; Final-Code Data Review shortened. Legacy
  migration wording removed from `SKILL.md` and cap3.
- This repository: the deck's capability ring gains CAP8, and CAP3 now reads Run the cases.

## Rechecked

Criteria 1-8 by a fresh agent on the scratch repository with the final skill: all as required, now with the
owner taken from CODEOWNERS. Criterion 9: a fresh agent audited a scratch range and reported the unapproved
Then, the weakened script and the swallowed identity check, not the harmless selector change; on an empty range
it reported only the head; on NSDK commit `55b44db23` it reported the E2E-156 sentence that commit deleted.
Criterion 10: read in the final diff. Skill tests: 31 pass. Mechanical defence: run on the final branch.

The deck's ring was checked by coordinates (nine nodes, no overlap, all inside the canvas), not by a rendered
screenshot.

## Net effect on the handoff

The Check item and "Decided for you" items naming `system-design.md` as the owner's home are replaced by
CODEOWNERS. Its Residual is settled here: NSDK needs no change; no PR check; client downloads agree; the deck
shows cap8. Who may waive a release blocked by a red case stays unnamed, on purpose: cap3 reports BLOCKED and
people decide.
