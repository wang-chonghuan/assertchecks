# ASSERT-8 acceptance checks

## AC1 Both formats are published

Check: `curl` the catalog and result format URLs on the running server.
True when: each returns 200 with a JSON Schema document (`$schema`, `$id`, `type: object`), and the
server judges reports with that same document (the files are the single definition).

## AC2 A wrong field is named by the dry run and nothing is recorded

Check: dry-run a catalog with a deliberately wrong field (for example a Then without `expect`, or an
invalid `status`) through the client's dry-run command against a ticket-scoped check; count that
check's runs before and after.
True when: the reply lists the field path (for example `catalog.cases[0].then[0]: missing expect`),
the client exits non-zero, and the run count is unchanged.

## AC3 NSDK still passes

Check: dry-run the NSDK catalog plus the Playwright report of NSDK DEV's latest stored run with the
NSDK DEV token; re-judge every stored NSDK run with the new validation.
True when: the dry run is valid and gives the same outcome as the stored run, every stored NSDK run
re-judges to its stored outcome, and after deployment the next NSDK DEV report is accepted.

## AC4 The homepage links the formats

Check: open `/` and read the report format section.
True when: it links both format documents and shows the dry-run command.
