# ASSERT-25 handoff

The owner delegated the ENG-1647 decision batch to Claude ("你决定吧"). Codex's NSDK batch carried
103 per-case questions. Most of them came from three overly strict lines in the assertchecks skill,
so the skill was tightened in finoge-app/narrative-skills#26:

- **Identity checks** pick a non-first item only when a second eligible object already exists.
  The old wording turned every selection into a question about a new data premise.
- **Fixed copy** is quoted as the product's own source or translation files define it. Third-party
  copy is checked through a stable element or field. The old wording made every label a question
  for the owner.
- **cap5** lets the human approve, once as a pattern, any rewrite that only makes a Then's existing
  meaning decidable. Only rewrites that change scope or meaning are listed individually, and
  details the code already asserts consistently with the Then are not escalated.

The rules themselves are unchanged. The skill's 32 tests pass, and `skillhost update` installed the
new version. The answers to ENG-1647 were written into that ticket's `grill.md` under the same
standing rules.
