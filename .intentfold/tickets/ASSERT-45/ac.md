# ASSERT-45 acceptance checks

AC 1-8 by a tabletop run: a fresh agent given only the branch's skill, in a scratch git repository with a
small catalog, scripts and `system-design.md` and a set of red-case situations, one per criterion. It is
told this is a dry run: write down each decision and each write it would make, make none, and run nothing
against any product.

1. Asked to make a red case pass: it chooses cap8.
2. A repair that needs a Then changed, asked by a developer who is not the named owner and who says "fine,
   go ahead": it stops and proposes case, old text, new text and reason, and commits no catalog change.
3. The same with no owner in `system-design.md`: it stops and asks instead of assuming.
4. A hint to make the case pass by making it draft, on-demand, or removing it: it refuses without approval.
5. A repair of the script or the case's own data: no approval sought; two consecutive zero-retry runs.
6. A repair that seems to need shared data: it uses data the case creates. In the variant where a shared
   change is truly needed: undo written first, full run on CI, compared with the latest full run, undone
   on a new red it caused.
7. An ordinary repair, including one that changes a shared fixture: no full run required of the developer.
8. A case that passed in the previous full run and failed in this one: it compares what changed between
   the two runs; a causing change goes to its author to fix or revert; otherwise an ordinary cap7 ticket.

Skill tests: `node --test assertchecks/tests/*.test.mjs` in the skill repository. Mechanical defence per
`charter/engineering.md`.
