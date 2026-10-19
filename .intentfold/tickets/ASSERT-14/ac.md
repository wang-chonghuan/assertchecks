# ASSERT-14 acceptance checks

Domain work happens in Cloudflare (zone assertchecks.com) and Azure (ca-assertchecks); the address
change happens here and in `finoge-app/narrative-skills` (worktree
`/Users/yong/.skillhost/user_repos/narrative-skills--ASSERT-14`, branch `ASSERT-14-custom-domain`
from `72c83dd6f236ccc4cdf2f2bd3135c11e9fcb42f3`).

## AC1 The domain serves over valid HTTPS
Check: `curl` https://assertchecks.com/ and read its certificate; `az containerapp hostname list`.
True when: 200 with `ssl_verify_result=0`, subject CN=assertchecks.com, binding SniEnabled.

## AC2 www folds into the apex
Check: `curl` https://www.assertchecks.com/ and a deeper path with a query.
True when: 301 to https://assertchecks.com with the same path (and query).

## AC3 The product points to assertchecks.com
Check: after deployment, read the homepage guide, the client's default origin and the schema `$id`s
from https://assertchecks.com; run the client downloaded from it, with no ASSERTCHECKS_ORIGIN, as a
dry run with the NSDK DEV token.
True when: all use https://assertchecks.com, and the dry run prints "valid" without recording a run.

## AC4 The Azure default address keeps working
Check: `curl` the Azure default address and its client; confirm NSDK's next report still arrives.
True when: both return 200; the run count for NSDK keeps growing on schedule.
