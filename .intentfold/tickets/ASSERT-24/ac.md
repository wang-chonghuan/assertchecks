# ASSERT-24 acceptance checks

## AC1 Rules and capabilities are in the skill, bound to no project
Check: finoge-app/narrative-skills#25: `assertchecks/SKILL.md` "Assertion Oracles", `references/cap4.md`,
`references/cap5.md`, cap0, cap1, the templates and `agents/openai.yaml`; search for project names,
account IDs and project file names.
True when: the oracle table, the three reconciliation rules, the defect list, cap4 (read-only audit and
report) and cap5 (remediation that keeps coverage, human approval for catalog text, assertions shown
able to fail) are present, and nothing names a specific project.

## AC2 cap4 finds known defects from the skill text alone
Check: a read-only subagent given only the new skill files runs cap4 on ten cases of a real project
whose defects were established by an earlier independent audit.
True when: it finds the known defect classes (reconciliation rules not met, unchecked negative claims,
vacuous passes, loose text matching, code diverging from its Then) and keeps the known-compliant
control compliant.

## AC3 Checks
Check: the skill's own tests; after merge, `skillhost update` installs the new version.
True when: they pass and the installed skill contains cap4 and cap5.
