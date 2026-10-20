# ASSERT-27 handoff

The assertchecks skill had no capability for discovering missing cases. NSDK's 100 drafts
(ENG-1644) came from a one-off prompt.

The owner set the scope: the UI, plus the server endpoints that someone causing trouble can reach.
That means every internet-reachable endpoint, whether documented or only called by the product's own
front end. intentqa, in wang-chonghuan/intentplex-skills, has similar baseline discovery. It was used
as a reference and left unchanged.

## What changed (finoge-app/narrative-skills#28)

- **SKILL.md** states the case scope. Cases cover only what an outsider can reach.
  Server-to-server calls, background jobs and the database are not cases of their own, but they
  may be oracle sources.
- **cap6 "Discover Cases"**:
  - **Sources:** intent first (public docs, release notes, ticket), then a walk through the
    product as the configured accounts and anonymously. Route definitions and network traffic are
    used only to list entry points.
  - **Coverage map:** surfaces × states (success, empty, invalid, denied, persistence,
    repeated/concurrent, money). For endpoints it adds hostile-caller probes: a missing or forged
    session, another account's IDs, tampered, oversized or malformed input, wrong methods, and
    leaks.
  - **Gaps only:** one case per outcome; money, data loss, access control and core journeys come
    first.
  - **Safety:** read-only by default, only permitted writes and probes, no mocks, stubs, load or
    brute force. Cross-account checks use test-owned accounts or nonexistent IDs. A real exposure
    is stopped and reported.
  - **Output:** drafts that meet Assertion Oracles, with questions where expectations are unknown,
    plus a discovery note in the ticket records. The owner approves; cap1 implements.
  - **Rhythm:** a baseline once, then per ticket or release.
- **Templates and cap0**:
  - `system-design.md` gains "Exposed surfaces": UI entry points and roles, the source that lists
    endpoints, cross-account accounts and the probes allowed per environment.
  - cap0 asks for them.
  - `agents/openai.yaml` lists cap6.

## Verification

A fresh read-only subagent was given only the new skill text. It ran cap6 offline over NSDK's
Settings area, using code, docs and the catalog, with no browsing and no edits. It produced:

- **A coverage map** that shows which existing cases cover each cell.
- **Seven prioritised drafts.** The first rejects anonymous, invalid-bearer and forged
  `X-User-Id` calls with 401 and an unchanged profile. The others cover malformed support
  messages, invalid profile writes, double submission, persistence, and deletion on a test-owned
  account.
- **Eleven questions**, including:
  - a consent toggle that may submit unsaved profile edits;
  - no revision check on profile writes;
  - an exposed `delete_personal_data_request` endpoint that the UI does not use;
  - the local auth bypass.

  It listed status codes read from code as questions rather than expectations, as cap6 requires.

The skill's 32 tests pass. `skillhost update` installed the version that includes cap6.
