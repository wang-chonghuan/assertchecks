# ASSERT-22 acceptance checks

## AC1 Template time limits
Check: the assertchecks skill's `assets/project/playwright.config.ts`, `assets/workflow/assertchecks.yml`,
`assets/project/system-design.md`, `references/cap0.md` and `SKILL.md`.
True when: `globalTimeout` is 60 minutes, the CI job 70, and the rules (limits only stop hung runs; a
stopped run is Incomplete and never rerun; long workflows use their own case timeout; grace longer
than the job) are written down.

## AC2 A stopped run is Incomplete
Check: `tests/judge.test.ts` with a Playwright report shaped like a `globalTimeout` stop, run against the
old and new `src/server/judge.ts`.
True when: the new code judges it Incomplete with "interrupted by the time limit" and "stopped at its
60-minute time limit", the stopped case is `interrupted` with its unfinished Then not run; the old code
fails the test; all other tests pass.

## AC3 Pages say what happened
Check: production build with a ticket-scoped check and a reported stopped run.
True when: the case shows Interrupted, the card counts it as "not run" rather than "failed", the tab
reads "Not passed", and the run shows Incomplete with the time-limit reason.

## AC4 Checks and deploy
Check: typecheck, test, build, antd lint; the post-deploy check.
True when: all pass.
