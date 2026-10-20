# ASSERT-30 handoff

An ips-skilleval audit of the assertchecks skill found about 32 candidates. After merging they were
22, and after adversarial refutation 9 survived. The second shape pass said to patch, not restructure.
All nine are fixed in finoge-app/narrative-skills#33, mostly by deleting a drifted copy of a rule.

| Finding | Fix |
|---|---|
| The workflow template's job-level `${{ runner.temp }}` is rejected by GitHub | Moved to the env of the two steps that use it; actionlint 1.7.12 rejected the old template and passes the new one |
| The test step got no credentials or run-permission switches | The template has a slot for them; cap0 tells the human to create those CI secrets |
| The helper failed on a project schema that extends the format by `$ref` | The helper reads no schema (the client's dry run checks the format); `--schema` and the curl step are gone |
| NSDK's root `projects` field was built into cap2 and the helper | Removed; root fields are compared as-is |
| cap5's unscoped "arithmetic inside a case breaks rule 2" contradicted SKILL.md | Sentence removed |
| Time-limit wording ("reported Incomplete", "not a longer suite limit") | The outcome claims are removed; a case that needs longer raises the suite and CI limits together |
| cap4 overstated the client's credential check | Claim removed |
| The default baseline assumed an intentfold `ticket.json` | Explicit ref, then the base the project's workflow records, then ask |
| cap6 ran altered-expectation checks before the cap2 gate | Reordered |

Two choices were made on the owner's behalf. Generated-content checklists are judged by a model call
in the test, and `system-design.md` must permit that cost. The run sequence keeps both cap4's local
command and the CI template; only the template was completed.

The helper's 31 tests pass, and a read-only run over NSDK's 200-case catalog works. `skillhost update`
installed the new version.

Outside this ticket, NSDK's `assertchecks/system-design.md` "cap1 增量生成" still says the helper
reads the project schema's ID/status rules. Its section numbers are already stale per ASSERT-29.
Codex updates both. NSDK's own workflow already moved `runner.temp` in ENG-1636.
