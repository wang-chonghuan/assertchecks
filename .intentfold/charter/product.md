# Product

Human-owned. The machine reads this as binding intent; the owner authorized the agent to edit the
Charter on 2026-10-21. Section shape is fixed by `.intentfold/readme.md`.

*Seeded by IntentFold cap1 on 2026-10-17 only from the owner's own statements in the setup
conversation; extended with production errors at the owner's request on 2026-10-21 (ASSERT-36).*

## Contract

**What this product is**

AssertChecks shows whether each project works in production, in two views:

- **Tests** — whether each project's end-to-end assertions hold. Every project runs its own tests in
  its own container or runner and reports the results; AssertChecks only receives, judges and
  displays them. It is "healthchecks.io for e2e assertions": not only whether a job ran, but whether
  every declared assertion passed.
- **Production errors** — which runtime errors in production need handling, and how many.
  AssertChecks reads each project's own error telemetry read-only, filters out noise, groups the
  rest into problems, and shows which problems already carry a ticket.

**Who it is for**

Internal use by the owner and one organization: the company's projects (currently NSDK and BF) and
the owner's own projects. People sign in and see only the projects they belong to; one person may
belong to several projects. The owner reads the production-errors view every day.

**What good looks like**

For each project and environment, a person can see at a glance whether the latest run passed, and
which case and which assertion failed, without reading raw test logs. A run that did not fully
execute is never shown as passed.

For each project, a person can see each day which problems are new and untriaged, which carry a
ticket and whether they still occur, and how many failures needed handling, without reading raw
logs. A problem never disappears once it has a ticket, and AssertChecks never claims a problem is
solved; it shows when the problem last occurred.

**What this product is not**

- It does not run tests, build projects or host runners; projects own execution.
- It is not a multi-tenant public SaaS: no self-service sign-up, billing or organizations.
- It does not send alerts or notifications for now.
- It is not log search, APM or product analytics: traffic, sign-ups and funnels belong to PostHog,
  and deep investigation belongs to each project's own monitoring.
- It does not connect to ticket systems; it keeps the ticket link a person attaches.

## Tools

## Guidance

## Redlines

1. **Executing a project's tests, pulling its code, or storing a project's credentials, keys or
   connection strings inside AssertChecks** — forbidden outright. Projects push test results;
   production telemetry is read through AssertChecks's own cloud identity.
2. **Writing to a project's telemetry, monitoring or other cloud resources** — forbidden outright.
3. **Editing this file** — not without the human's explicit approval (granted standing on 2026-10-21).
