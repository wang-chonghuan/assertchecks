# ASSERT-29 handoff

At the owner's request, the assertchecks capabilities were renumbered in lifecycle order in
finoge-app/narrative-skills#30. Their content did not change.

| New | Capability | Was |
|---|---|---|
| cap0 | Connect | cap0 |
| cap1 | Discover cases | cap6 |
| cap2 | Author and synchronize tests | cap1 |
| cap3 | Run and diagnose, release verification | cap2 |
| cap4 | Report to AssertChecks | cap3 |
| cap5 | Audit | cap4 |
| cap6 | Remediate | cap5 |

The following now follow the new numbers: file names, headings, the capability table, the
description, cross-references and agent metadata. cap0 now says cap1–cap6 do the ongoing work, and
that its first cases come from the human or from approved cap1 drafts. Assertion Oracles names cap1,
cap2, cap5 and cap6 as its users.

The skill's 32 tests pass. `skillhost update` installed the new version.

The AssertChecks site mentions only cap0, which is unchanged. Outside this ticket, NSDK still uses
the old numbers:

- `assertchecks/README.md` cites cap1, cap2 and cap3, which are now cap2, cap3 and cap4.
- `assertchecks/system-design.md` cites cap1 and cap2, now cap2 and cap3.
- ENG-1647's records cite cap4 and cap5, now cap5 and cap6.

Codex updates those using this table.
