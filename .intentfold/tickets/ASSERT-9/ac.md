# ASSERT-9 acceptance checks

All checks use a throwaway project, check and member on the ticket preview (port 63009), removed
afterwards. "Required case" means a catalog case in the check's selection (default: active,
nightly).

## AC1 A removed required case is named

Check: report full run 1 with a catalog of required cases E2E-001..E2E-004, then full run 2 whose
catalog no longer contains E2E-002; open the project page and the check page.
True when: both show a "catalog changed" notice naming E2E-002 as removed from the catalog.

## AC2 A required case moved out of the run is named with its new state

Check: in run 2, E2E-003 is changed to draft and E2E-004 to manual.
True when: the notice lists E2E-003 as now draft and E2E-004 as now manual, alongside E2E-002.

## AC3 No notice without a reduction, and no change to judgement

Check: report full run 3 with the same catalog as run 2; also compare each run's stored outcome
with what it would be without this ticket (the judgement code is untouched).
True when: run 3 shows no notice; runs 1–3 have the outcomes their results give (all passed for
green results), so the notice neither blocks a report nor changes an outcome. A partial (named-case)
run between full runs does not change the comparison.
