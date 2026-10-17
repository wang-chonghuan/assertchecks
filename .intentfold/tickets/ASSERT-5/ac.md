# ASSERT-5 acceptance checks

1. Client test with an injected fetch that fails twice then returns a SHA: the version is recorded.
2. Client test with an injected fetch that always fails: exactly 3 attempts, then `null` and a warning;
   a run judged with that null is incomplete (existing judge test).
3. After deployment: download the client from production, check it contains the retry, and report a
   real run to a ticket-scoped check (removed at close); the run is recorded with both versions.
