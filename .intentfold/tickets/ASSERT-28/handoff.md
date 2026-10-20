# ASSERT-28 handoff

The owner asked to merge intentqa (wang-chonghuan/intentplex-skills) into assertchecks. The
assertchecks files, directories and standards govern, including the rule that generated content is
judged against a checklist by a model.

## Absorbed (finoge-app/narrative-skills#29)

- **cap2 "Release Verification".** On request, it runs every active case, nightly and manual, once
  against a named candidate whose versions are confirmed. Any failed, missing, skipped, flaky,
  blocked or cleanup-failed case makes the verdict BLOCKED; otherwise it is READY. The verdict
  covers only that candidate and environment and authorizes no deployment. A pass is never
  assembled from partial runs. cap2 also stops after three repairs of the same cause.
- **cap6 "Requirement Changes".** Cases are sorted into added, changed, retired and unaffected
  across the whole catalog. IDs are kept for the same behavior, retirement needs authorization and
  IDs are never reused. Conflicts go to the human with both sources, and an active case is never
  weakened because the product fails it. A product that cannot be explored yet is drafted from its
  approved design. MCP servers are in scope.
- **cap1** audits new or materially changed cases with cap4 before shared execution, preferring an
  independent reviewer for a large batch.
- **Test Implementation.** Anonymous cases start with no auth state, and sign-in cases perform the
  real sign-in.
- **Shared State.** Teardown covers a partly finished setup. After a killed run, the next run
  archives its own leftovers by case ID.

## Not adopted (conflicts; assertchecks governs)

- the `.intentgurad/` layout and per-case directories;
- the `source`, `approval` and `limitations` fields;
- spec digests in test annotations and `check.py`;
- runtime output outside the repository;
- leaving generated-content quality "unassessed";
- excluding internal endpoints from cases.

## Open

intentqa is not yet retired. TroveStep still keeps 8 active cases under `.intentgurad/` with
intentqa. Its migration, and intentqa's retirement, await the owner's decision.

The skill's 32 tests pass. `skillhost update` installed the merged version.
