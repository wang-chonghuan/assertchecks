# ASSERT-5 plan

## What the code says that the ticket does not

- `readVersions` in `public/client/assertchecks.mjs` makes one request per version URL and maps any
  error, non-2xx or malformed body to `null`; the server then records the run as incomplete.
- Both observed failures were network-level (`fetch failed`), not HTTP errors.
- The client already takes an injectable `fetchImpl`, so retries can be tested without the network.

## Route

1. Retry each version read up to 3 attempts, waiting 2 s then 4 s, on any failure (network, non-2xx,
   unparsable JSON, missing/invalid `sha`). After the last attempt keep today's behaviour: warning and
   `null`. The wait is injectable for tests.
2. Client tests: succeeds on the third attempt; gives up after 3 attempts with `null`.
3. README: one sentence on the retry.
