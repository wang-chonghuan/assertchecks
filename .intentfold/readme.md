# .intentfold

Read this first in every session. It is the single entry to project intent and ticket workflow.

*Machine-owned: IntentFold cap1 refreshes this file. The four files in `charter/` are human-owned;
do not edit them unless the human explicitly asks for a Charter change.*

## Start here

1. Read `.intentfold/project.json` for the project, main branch, ticket backend, deploy target, and
   service ports.
2. Read `charter/product.md` to understand what the product is, who it serves, and what it must not
   become.
3. Read `charter/engineering.md` before changing code or structure.
4. Read `charter/ui.md` when the work touches a user interface.
5. Read `charter/operations.md` when running, testing, querying, migrating, deploying, or operating
   the product.
6. Read the live ticket from the backend named by `project.json`, then its local artifacts under
   `tickets/<ticket-id>/`.

The Charter has exactly four files:

| File | Owns |
|---|---|
| `product.md` | product purpose, users, value, and non-goals |
| `engineering.md` | architecture, development rules, checks, dependencies, and landing |
| `ui.md` | design system and interface constraints |
| `operations.md` | local runtime, acceptance evidence, deployment, and operations |

Requirements live in the ticket backend, not in a local `req.md`. Use the **n-plane** or
**n-linear** skill selected by `project.json`. Linear ticket text is English; Plane ticket text is
Chinese unless the human asks otherwise.

## Charter format

Every Charter file has these four headings, in this order, even when a section is empty:

```markdown
## Contract
## Tools
## Guidance
## Redlines
```

They are different kinds of information:

| Section | States | How it is used |
|---|---|---|
| `Contract` | what the artifact is | referenced while authoring |
| `Tools` | commands, paths, ports, URLs, viewports | looked up at the moment of acting and run as written |
| `Guidance` | how to approach the work | followed while writing |
| `Redlines` | forbidden or approval-required actions | looked up before acting; never judged away |

Use these tests when writing:

1. **Contract or Guidance:** does the line describe the artifact, or the act of changing it?
2. **Guidance or Redline:** can compliance be decided from a path, token, command, or structural
   fact without reading and interpreting the implementation? If not, it is Guidance.
3. **Tools:** could the concrete value go stale? Commands, paths, ports, URLs, and viewports belong
   here once; other files point here rather than copy them.
4. **Derive, do not enumerate:** a check derives targets from the product, manifest, sitemap, schema,
   or registry and fails when derivation returns nothing. It does not preserve a second hand-written
   list of routes, fields, or fixtures.

Redlines live in the file whose subject they govern. There is no separate redline file. Each entry
says either **forbidden outright** or **not without the human's explicit approval**.

Write only what the code, configuration, schema, design system, or a command cannot answer more
reliably. Prefer making a rule mechanical in `Tools` over emphasizing it in prose.

## Ticket artifacts

`tickets/<ticket-id>/` may contain:

- `ticket.json` — mode, stage, finish, checkout, branch, base, and ports;
- `draft.md`, `plan.md`, and `ac.md` as required by the development path;
- `grill.md` whenever cap3 runs its grill: the complete question batch is saved before asking,
  and answers are recorded in the same file;
- `handoff.md`, plus `intentfold-usage.json` when configured;
- `rework.md` when the delivered branch changed after the first handoff;
- `tmp/` for uncommitted evidence.

The ticket backend decides whether work is live or Done. `handoff.md` freezes at first delivery;
read it together with `rework.md`.

Project scratch lives in `.intentfold/tmp/`. Scratch and environment files are not committed.

## Workflow

Use the **intentfold** skill:

- cap1 initializes this harness;
- cap2 files one ticket;
- cap3 develops one ticket autonomously;
- cap3setup prepares an open development phase;
- cap3handoff verifies and records completed development;
- cap4 merges and closes a verified ticket.

No product change without a ticket.
