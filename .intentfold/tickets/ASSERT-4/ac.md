# ASSERT-4 acceptance checks

1. `SKILL.md` lists cap3 and links `references/cap3.md` (read the file).
2. After deployment, follow cap3 literally against a ticket-scoped check: download the client from
   production, `start`, `report` a real Playwright report with its catalog; the run appears on the
   check page with the reported outcome.
3. `node --test assertchecks/tests/catalog-changes.test.mjs` passes; cap1/cap2 content unchanged
   apart from the one cap3 pointer line in cap2.
