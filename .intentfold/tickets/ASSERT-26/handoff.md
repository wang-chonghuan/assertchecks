# ASSERT-26 handoff

The owner asked whether cases leave state that breaks later cases, and for a simple, effective fix.
The owner also barred any mock or stub data.

## Findings (NSDK, read-only)

- None of the 172 active cases needs restoration. The nightly cases only read.
- The manual Coach cases append conversations, which add data but change nothing else.
- The 12 cases that would change shared state are all drafts and already declare restoration.
  E2E-005 already has a change-and-restore fixture.
- The AssertChecks tests and fixtures contain no mocks, stubs or intercepted requests.

## What changed (finoge-app/narrative-skills#27)

SKILL.md gained a short "Shared State" section:

- **Create your own data first.** Data is created only through real product operations, named with
  the case ID and archived at the end. Mocks, stubs, intercepted or fabricated responses, seeded
  rows and simulated services are not allowed.
- **One shared change-and-restore fixture** for things that exist once per account. It reads the
  original and its revision, restores in teardown after success, failure or timeout without
  overwriting newer changes, and rereads to confirm. A failed restore fails the case.
- **Premises catch leaks.** List reads bind to the case's own object IDs.

The existing live-evidence ban now also names stubs and intercepted or fulfilled requests. The
skill's 32 tests pass, and `skillhost update` installed the new version.
