# ASSERT-8 rework

The first delivery is frozen in `handoff.md`. One change came after it.

## 7952aff — case page no longer requires the project-only `type` field

- **Ask:** not a request from the owner. ASSERT-10's acceptance found it while this branch was still
  unmerged: a catalog in the format this ticket publishes, without NSDK's own `type` field, crashed
  the case page ("Cannot read properties of undefined (reading 'toUpperCase')").
- **Change:** `CaseSpec.type` is optional, and the case page shows the type tag only when present.
- **Rechecked:** the case page of a format-only catalog shows Given/When and each Then result.
  NSDK's case page still shows its "UI" tag. Typecheck passed. The mechanical defence ran once on
  the final branch at close.
- **Net effect:** AssertChecks pages depend only on the fields of the published catalog format.
