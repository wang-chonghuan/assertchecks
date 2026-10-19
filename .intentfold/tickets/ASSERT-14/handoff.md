# ASSERT-14 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit. The owner authorized binding the production domain,
redline 6 in `operations.md`, and asked not to be involved. No browser was needed: everything went
through the Cloudflare API and `az`.

## What changed

**Domain**, following ips-golive cap2. These are external state, not repository content.

- Cloudflare zone `assertchecks.com` (active, Free plan) had no DNS records and no redirect rules.
  Nothing existing was changed or deleted. Added, each with a comment naming ASSERT-14:
  - `A assertchecks.com → 20.54.18.105`, DNS only (the environment's static IP);
  - `TXT asuid.assertchecks.com = <customDomainVerificationId>`;
  - `CNAME www.assertchecks.com → assertchecks.com`, proxied;
  - a dynamic redirect rule: host `www.assertchecks.com` → 301
    `concat("https://assertchecks.com", http.request.uri.path)`, keeping the query string.
- Azure: `bind_cloudflare_domain.py` checked DNS first (the apex resolves to the Azure IP, not
  proxied), then added `assertchecks.com` to `ca-assertchecks` and bound a managed certificate with
  HTTP validation. The binding is `SniEnabled`, with certificate
  `mc-cae-easyapp-sh-assertchecks-com-6342`. SSL/TLS mode was not touched.

**Code**: platform in this repository, skill in `finoge-app/narrative-skills`, branch
`ASSERT-14-custom-domain`, commit `7d2a195`, base `72c83dd`.

- Public addresses now use `https://assertchecks.com`:
  - the client's `DEFAULT_ORIGIN`;
  - the connection guide's `ORIGIN`, so the homepage and "Copy for your agent" use it;
  - the two schema `$id`s;
  - the README client URL and Deployment note;
  - `.intentfold/project.json` `deploy.where`.
- `charter/operations.md`, at the owner's request in this ticket's scope:
  - Production now records the public address and its Cloudflare/Azure layout, and that the
    default hostname stays in service.
  - The post-deploy check reads `https://assertchecks.com` and also checks the default hostname's
    client.
- Skill: `SKILL.md`, `references/cap3.md` and the workflow template use `https://assertchecks.com`.
- The ASSERT-10 NSDK brief is a historical record and keeps the old address.

## AC results

1. **Valid HTTPS — passed.** `https://assertchecks.com/` returned 200 with `ssl_verify_result=0`.
   The certificate subject is `CN=assertchecks.com`, issued by DigiCert (GeoTrust TLS RSA CA G1),
   valid until 2027-04-19 and renewed by Azure. `az containerapp hostname list` shows `SniEnabled`.
2. **www folds into the apex — passed.** `https://www.assertchecks.com/` → `301` to
   `https://assertchecks.com/`. `/schemas/catalog.schema.json?x=1` → `301` to the same path and
   query on the apex.
3. **Product points to the domain — passed before merge; to be re-read from production at close.**
   - The worktree's client, run without `ASSERTCHECKS_ORIGIN`, used `https://assertchecks.com` and
     dry-ran NSDK's catalog with the DEV token: "valid; nothing was recorded". The run count stayed
     6.
   - The new post-deploy command returned 200 for `/`, `/login`, `/schemas/catalog.schema.json` and
     `/client/assertchecks.mjs` on the domain.
   - The guide and schema `$id`s change only when this branch is deployed; cap4 confirms them on
     the live site.
4. **Default hostname keeps working — passed.** The Azure default address returned 200 for `/` and
   for `/client/assertchecks.mjs` after binding. NSDK's workflow uses that address and was not
   changed. Its next scheduled report is the ongoing confirmation.

Mechanical defence: typecheck, 38 unit tests and build passed; the skill's helper tests passed 32
of 32.

## Deviations

None from the proposed solution.

## Environment

No env keys and no migrations. External state: four Cloudflare objects and one Azure hostname with
a managed certificate, all listed above.

## Residual

- Pointing NSDK's workflow at `https://assertchecks.com` is optional, and NSDK's own business.
- The remaining ips-golive capabilities are not needed for an internal tool unless wanted:
  analytics (cap3), search consoles (cap4), crawl surface (cap5) and share cards (cap6).
