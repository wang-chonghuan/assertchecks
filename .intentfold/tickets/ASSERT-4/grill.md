# ASSERT-4 grill

Mode: Grill: human. Saved before asking; answers below.

## Q1. Where and how does the skill change land?

Recommendation: branch and PR in `finoge-app/narrative-skills` from a separate worktree (not the
SkillHost-installed checkout), merged together with the other tickets at the end.

## Q2. What does cap3 cover?

Recommendation: a new `references/cap3.md` "Publish results": create a check and token with the
AssertChecks CLI (operator step), download the client from the site, call `start` before and
`report` after the Playwright run, choose `trigger`, pass version URLs, keep the token in
`ASSERTCHECKS_PING_TOKEN`, and treat a failed push as a failed job. cap1 and cap2 stay unchanged;
cap2 gains one line pointing to cap3 for publishing.

## Answers

Answered by the owner on 2026-10-17: Q1 and Q2 accepted as recommended.
