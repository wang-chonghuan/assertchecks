# ASSERT-36 plan: production errors tab

## What the code and data already say that the ticket does not

- The project page (`src/routes/_app/p/$project/index.tsx`) is one card grid fed by `getOverview`;
  membership scoping lives in `queries.ts` (`project()`), and every web surface so far is read-only.
  Problem decisions are the first web writes: a POST server function under the existing CSRF check.
- The app has no Azure identity (`identity.type` is None) and no Azure SDK. `@azure/identity` 4.13.3
  and `@azure/monitor-query-logs` 1.0.0 are the newest releases older than two weeks; the owner
  approved adding them (ticket comment 10-21).
- Every 5xx in BF and NSDK over 30 days belongs to a request that also logged an exception, so
  problems are built from `AppExceptions` alone; 5xx needs no separate source.
- NSDK's exceptions carry no `OperationName`; where a problem happened comes from the request with
  the same `OperationId`. `Details[0].rawStack` holds the full stack for the expanded view.
- BF's background worker reuses one `OperationId` for a month, which is why rule 1 adds the 1-minute
  window for server records.

## Route

1. Charter (owner-authorized, in this ticket): product, engineering and operations changes already
   committed; add the new modules to `engineering.md` Structure, the Azure query decision to Stack,
   and the new component to `ui.md`.
2. Migration `006_production_errors.sql` (additive): `error_sources` (one workspace per project, an
   optional app-role filter) and `error_problems` (project, key, kind error|slow, first/last seen,
   decision ticket|ignored with ticket URL or reason, who and when).
3. `scripts/admin.ts`: `source:set <project> <workspace-resource-id> [--roles a,b]`,
   `source:remove <project>`, sources in `list`.
4. `src/server/telemetry.ts`: `DefaultAzureCredential` + `LogsQueryClient.queryResource` against the
   workspace; four KQL queries run in parallel and cached in memory for 5 minutes per project:
   problem failures in 5-minute buckets (dedup rules 1–3, noise removed), problem details (latest
   sample with stack, where, message variants), noise summary for 7 days (4xx, scanner probes,
   aborted requests, third-party analytics, "Script error."), slow hours per operation.
5. `src/server/production-errors.ts`: pure assembly (unit-tested) — merge stored problems with the
   query result, derive groups (to triage, with ticket, quiet 30+ days, not handling), statuses
   (new, still occurring since ticket, quiet N days since ticket), headline counts, 30 daily bars and
   co-occurrence hints; plus the DB upsert of first/last seen and the decision write, both scoped by
   membership.
6. `src/server/fns.ts`: `getProductionErrors` (GET) and `decideProblem` (POST).
7. UI: project page gets antd `Tabs` — Tests (default, today's cards unchanged) and Production
   errors (`?tab=errors`, loaded only when that tab is open). `src/components/production-errors.tsx`
   renders headline, daily bars, problem tables with expandable detail, decision modal, noise collapse.
8. Infra after the code works locally: n-easyapp cap5 enables the system identity on
   `ca-assertchecks` and grants Log Analytics Reader on `log-benefits-prod` and `log-nsdk-n0k21`.
   Then `source:set` for the real `bf` and `nsdk` projects.
