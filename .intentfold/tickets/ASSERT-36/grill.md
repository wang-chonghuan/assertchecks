# ASSERT-36 grill

No question passed the bar: the owner settled the product in the 10-21 discussion recorded in the
ticket's Request and authorized every approval the work needs ("授权你所有权限，开始开发").

## Decided for you

1. Source granularity — one production workspace per project, with an optional app-role filter for
   a workspace shared by several apps. Basis: Request says production; BF and NSDK each have one
   workspace; the owner's own projects may share one App Insights resource.
2. Problems come from `AppExceptions` only. Basis: every 5xx in both projects over 30 days has an
   exception in the same request (probe 10-21). Failed dependency calls that the request survived are
   not actionable on their own.
3. Noise categories are exactly the ticket's list. Browser-extension style errors (`$` undefined,
   WKWebView) stay problems the owner can mark Not handling. Basis: AC 3.
4. Slow rule — an operation is slow in an hour with at least 10 requests whose p95 is at least
   1 s and at least twice that operation's 30-day p95. Each slow hour is one occurrence. Basis:
   BF p95 54 ms and NSDK 35 ms today, so 1 s is far from normal; thresholds are shown and easy to tune.
5. Co-occurrence — two problems are shown together when their first occurrences are within 60
   minutes, or at least half of their active hours coincide. Basis: catches the NSDK 10-04 outage,
   the 10-08 schema pair and the BF 09-29 LLM pair on real data without tying everything to the
   always-on browser noise.
6. No background sync in this ticket: the tab queries on open with a 5-minute cache and upserts first
   and last seen. Basis: Slack (the only consumer of a timer) is a later ticket.
7. Any project member may attach a ticket or mark Not handling; who and when are recorded.
   Basis: memberships are already the access model; Request names no narrower group.
8. Acceptance uses ticket projects pointed at the real workspaces; `bf` and `nsdk` only receive their
   source. Basis: operations redline 2 forbids acceptance writes to real projects; reading telemetry
   writes nothing to them.
9. Interface text is English (ui.md). Counts window for noise is 7 days; headline window 24 h.
