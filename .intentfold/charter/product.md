# Product

Human-authored. The machine reads this as binding intent and never edits it.
Section shape is fixed by `.intentfold/readme.md`.

*Seeded by IntentFold cap1 on 2026-10-17 only from the owner's own statements in the setup
conversation; the owner should review and rewrite it.*

## Contract

**What this product is**

AssertChecks is a general platform that shows whether each project's end-to-end assertions hold.
Every project runs its own tests in its own container or runner and reports the results;
AssertChecks only receives, judges and displays them. It is "healthchecks.io for e2e assertions":
not only whether a job ran, but whether every declared assertion passed.

**Who it is for**

Internal use by one organization with several projects (currently NSDK and BF). People sign in and
see only the projects they belong to; one person may belong to several projects.

**What good looks like**

For each project and environment, a person can see at a glance whether the latest run passed, and
which case and which assertion failed, without reading raw test logs. A run that did not fully
execute is never shown as passed.

**What this product is not**

- It does not run tests, build projects or host runners; projects own execution.
- It is not a multi-tenant public SaaS: no self-service sign-up, billing or organizations.
- It does not send alerts or notifications for now.
- For now it shows only the latest run per check, not run history.

## Tools

## Guidance

## Redlines

1. **Executing a project's tests or holding a project's product credentials inside AssertChecks** —
   forbidden outright. Projects push results; AssertChecks never pulls code or runs suites.
2. **Editing this file** — forbidden outright. Product intent is the human's exclusively.
