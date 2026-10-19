# ASSERT-22 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## Decision (owner, 2026-10-19)

Time limits only stop a hung run; they are not a performance target. The whole suite gets 60 minutes,
the CI job 70, and long workflows such as onboarding keep their own budget. A run that reaches its
limit is reported as Incomplete and the whole suite is not rerun automatically.

## What changed

- **assertchecks skill** (finoge-app/narrative-skills#24):
  - The Playwright template's `globalTimeout` is now 60 minutes, up from 10. The workflow's
    `timeout-minutes` is 70, up from 30, so the report step still runs after a stopped suite.
  - `system-design.md` has a "Time limits" section.
  - cap0 asks for the project's run time when the defaults do not fit, and tells the operator to set
    a grace longer than the CI job.
  - SKILL.md states the rule.
- **Judgement** (`src/server/judge.ts`):
  - A Playwright result with status `interrupted` makes the case `interrupted`, not failed. The Then
    that was running when the limit hit counts as not run.
  - Playwright's "Timed out waiting Ns for the … to run" run-level error becomes the reason "the run
    stopped at its N-minute time limit" instead of "1 run-level error(s)".
  - Such a run is Incomplete.
- **Pages**:
  - An Interrupted case tag.
  - The summary card counts "not run" (interrupted, skipped, flaky, missing) apart from "failed".
    Before, all of them showed as failed.
  - The check page's first tab reads "Not passed".
- **Connect guide**: "Report every run from CI" states the time rule and the grace needed.
- NSDK's own generated config is not touched; Codex syncs it from the updated template.

## AC results

1. **Template — passed.** All five skill files carry the values and rules. The skill's 32 tests
   pass, and the installed skill now generates the 60-minute config.
2. **Stopped run is Incomplete — passed.** The new judge test fails against the old `judge.ts` (14
   pass, 1 fail) and passes against the new one. The full suite passes with 39 tests.
3. **Pages — passed.** On a local production build, a stopped run reported through the real client
   was judged Incomplete. Its card reads "1 passed · 0 failed · 2 not run" with the reason "E2E-002
   interrupted by the time limit; E2E-003 skipped; the run stopped at its 60-minute time limit; …".
   The case shows Interrupted with its Then "Not run", and the tab reads "Not passed (2)". The test
   project, member and Clerk test user were removed.
4. **Checks — passed.** Typecheck, test, build and antd lint pass. The post-deploy result is on the
   Plane ticket.

Left as it is: the card's check-level tag still reads "Failing" for any finished full run that did
not pass, including an Incomplete one. That status set (New, Up, Failing, Late) predates this ticket.
