# ASSERT-36 acceptance

Data: ticket-scoped projects `assert-36-bf` and `assert-36-nsdk` whose source is the real BF and
NSDK production workspaces (read-only), `assert-36-none` with no source, and `assert-36-other` the
test user is not a member of. User `assert-36+clerk_test@example.com` (code 424242), member of the
first three. Local server on port 63036 authenticates to Azure as the developer's `az login`.
Decisions are made only on the ticket projects; `bf` and `nsdk` only get their source configured.
Browser: built-in browser at 1440×900 and 390×844.

1. Open `/p/assert-36-bf`: the Tests tab is selected and shows the same cards as before (none for a
   project without checks → the same empty card as today).
2. Production errors tab: one headline line with to-triage count, with-ticket count and how many
   still occur, failures in the last 24 h and the day before; 30 daily bars below it.
3. The filtered-noise collapse lists 4xx, scanner probes, aborted, third-party analytics and
   "Script error." with counts; expanding shows the entries. No "Script error." problem row exists.
4. On `assert-36-bf`: one `redis.exceptions.TimeoutError` problem whose failure count is half its
   record count (8 vs 16 in the probe); no separate problem for the wrapper; `TelemetryQueryError`
   is its own problem; the `M_ID` problem counts page visits, not its 65 records.
   Cross-checked with a KQL record count.
5. Expanding a problem shows its message variants with counts and last time, the latest sample with
   stack; problems that appeared together carry a hint naming the others (NSDK 10-04 and 10-08).
6. On a ticket project: attach a ticket URL → the row moves to With ticket; mark another Not
   handling with a reason → folded group with counts; undo both → back to triage. Who and when show
   on the row. Reload and a fresh session show the same state; `psql` confirms the rows.
7. The same ticket URL on two problems: both rows show it.
8. A with-ticket problem shows last occurrence, failures since the ticket and "still occurring" or
   "no occurrence for N days"; the page contains no "resolved"/"solved" wording.
9. A problem last seen over 30 days ago sits in "Quiet for 30+ days"; the grouping rule is covered by
   a unit test that moves it back when it recurs.
10. Slow operations: the unit test covers flagging; on real data the section shows either the
    flagged operations or none.
11. `/p/assert-36-none?tab=errors` shows "Not connected", not zero.
12. `/p/assert-36-other?tab=errors` → 404 for the test user; a direct `decideProblem` call for that
    project fails.
13. `pnpm admin list` shows the `bf` and `nsdk` sources; `assert-36-bf` / `assert-36-nsdk` show real
    BF and NSDK production problems.

Always: `pnpm typecheck && pnpm test && pnpm build`, the antd lint, no page-level horizontal scroll
at 390×844.
