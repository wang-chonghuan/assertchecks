# ASSERT-5 grill

Mode: Grill: self (the owner authorized the agent to decide the details, 2026-10-17).

## Q1. How many attempts and how long?

Decision: 3 attempts, waiting 2 s and 4 s (at most about 6 s plus request time per component).
Reason: covers a transient network blip without noticeably delaying a run; a persistent outage still
ends as `null` and an incomplete run, so the judgement rules are unchanged.

## Q2. Which failures are retried?

Decision: every failure of a version read — network error, non-2xx, unparsable body, missing or
malformed `sha` — because the client cannot tell a transient bad response from a lasting one, and
the cost of one more attempt is small.
