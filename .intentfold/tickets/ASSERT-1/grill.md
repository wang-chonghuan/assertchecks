# ASSERT-1 grill

Mode: Grill: human. Saved before asking; answers below.

## Q1. Which run is "the latest"?

Recommendation: the latest finished run (passed/failed/incomplete) supplies the displayed results;
if a newer run is still running, show a one-line "Run in progress since <time>" (or "Timed out")
notice above it.
Reason: a running run has no results yet; showing an empty table would hide the last known truth.

## Q2. Remove the standalone run page?

Recommendation: yes. Its content moves into the check page, which always shows the latest run. Old
run URLs return the shared 404.
Reason: otherwise every old run stays browsable by ID, which is history by another door.

## Q3. A case the latest run's e2e no longer declares?

Recommendation: its case page returns 404; the check page lists only cases in the latest run.
Reason: "the latest run uses the newest e2e" means retired or removed cases disappear with it.

## Answers

Answered by the owner on 2026-10-17: Q1, Q2 and Q3 accepted as recommended.
