# Presentation Data Operation

One-time runtime operation, not a product-code change. The live Plane ticket is the requirements
source. Full catalogs, database row IDs, fingerprints and operational utilities remain in ignored
local scratch rather than this public repository.

## Deliverable

- NSDK has a separate `prod-live` environment, created through the existing operator CLI.
- Synthetic daily history covers 2026-10-16 through 2026-11-13: 29 full runs, each with 91 cases and
  136 Then results.
- Cases retain the current catalog's groups and Given/When/Then. Selection uses cases passed in
  both current DEV and PROD snapshots, excluding linked tickets and known failure notes.
- Daily timings vary from observed case durations. No external CI URLs or fabricated deployment
  versions are stored. Synthetic origin is retained in run metadata and the private receipt.
- The requested timing/commit adjustment sets each start to 19:00 UTC, preserving its original
  duration. The displayed commit is the most recent successful NSDK PROD publication completed
  before that start, from the existing deployment notifications. Days without publication reuse
  the online version; a publication after 19:00 first applies to the following day's presentation.
  For component-only publications, the commit follows that published component. This is display
  metadata, not evidence that the test suite executed from that commit. Deployment columns and
  external CI links remain unset.
- There is no schedule, schema migration, UI change, runner, new dependency or deployment.
- BF and all pre-existing environments, runs, shared tickets and users are outside the write scope.

## Local Cleanup

The durable, ignored local copy is:

```bash
bash /Users/yong/work/assertchecks-ws/assertchecks/.intentfold/tmp/ASSERT-59/cleanup-nsdk-prod-live.sh
```

This command is for the owner's later deletion request, not a step to run during review.
It reads database settings from this checkout's ignored `.env`, locks the exact created environment
ID, checks its project and fingerprint, and requires the stored runs to match the private receipt.
It deletes only that environment; the existing foreign-key cascade removes its runs. It never deletes
project-level ticket links or users. If the environment or its runs changed, it refuses deletion.
Once deleted, repeating the command is a no-op. Another environment reusing the slug is never adopted.
The metadata adjustment retains a private before/after receipt journal, written before the database
transaction commits. Cleanup accepts only the exact old or new owned fingerprints during recovery,
then retains the same refusal behavior for unrelated changes. The durable main-checkout utility and
receipt are refreshed together; the guard can be checked read-only without deleting the environment.

## Rehearsal

The same generation and cleanup were exercised against a ticket-scoped project, created and removed
through the existing CLI. All 29 generated reports passed format and dry-run judgement checks;
cleanup removed the one check and 29 runs, then repeated without changing data. Pre-existing
record fingerprints remained unchanged. Production data is synthetic presentation history,
not evidence that NSDK tests actually executed.
