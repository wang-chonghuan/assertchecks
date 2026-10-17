# ASSERT-5 handoff

## What changed

- `public/client/assertchecks.mjs`: each `--version` read is tried up to three times, waiting 2 s and
  4 s; any failure (network, non-2xx, unparsable body, missing or malformed `sha`) is retried. After
  the last attempt the version is still recorded as unreadable (`null`) with one warning, so the
  judgement rules are unchanged. The wait is injectable (`run(..., { sleep })`) for tests.
- `tests/client.test.mjs`: retry-then-success and give-up-after-three tests; the harness injects a
  no-op sleep.
- `README.md`: one sentence on the retry.

## AC results

1. **Recovers after two failures — passed.** Injected fetch fails twice then answers: three reads,
   waits of 2000 ms and 4000 ms, version recorded, no warning.
2. **Gives up after three attempts — passed.** Injected fetch always fails: exactly three reads, then
   `null` and the warning "… after 3 attempts …". A run whose versions are not all recorded is judged
   incomplete by the existing judge test.
3. **Production client — verified at deployment** (the client is served by the deployed site).

Mechanical defence: typecheck, 21 unit tests, build — passed.

## Deviations

None from `plan.md`.

## Environment

No ports or env keys.

## Residual

None.
