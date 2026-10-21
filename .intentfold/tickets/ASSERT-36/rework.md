# ASSERT-36 rework

Two rounds after the frozen handoff, both in `src/components/production-errors.tsx`. No change to
queries, data, migrations or the server.

## Round 1 — 9f7d0c1

Ask: "nothing in the last 7 days折叠卡是什么，这些字令人费解。然后attach ticket应该placeholder写linear或者plane.so的链接"

- The folded group of untriaged problems is "Not seen in the past 7 days (n)"; its empty text says
  the same.
- The ticket field is labelled "Linear or Plane ticket link"; the placeholder is
  `https://linear.app/… or https://app.plane.so/…` and fits the field.
- Rechecked: AC 2 and AC 6 by opening the dialog and reading the page (label, placeholder, folded
  group); antd lint, typecheck.

## Round 2 — f0c50e1

Ask: "Production errors 页面的缩紧和行间距都有问题，你用ui设计师的眼光审查一下"

- One left edge: the expand icon moved to the row's end and the whole row opens, so problem names
  line up with card titles; the in-card fold is flat, the folded groups below use the card padding
  and the card's white surface.
- Line rhythm: every cell starts at the top so a row's first lines align; title and subtitle stack
  without a gap; hint and status sit one step below; rows use the middle table padding.
- Tags no longer stretch across the column; stacked buttons share one width; the ticket status is
  two lines (link; tag with who and when).
- Expanded detail: the variants table keeps dates on one line; the stack is a code block on the
  type scale. Noise entries keep counts beside their labels.
- Phones: the 30-day peak gets its own line under the dates.
- Rechecked: measured positions in the browser at 1440×900 (card title, problem name and fold arrows
  on one edge; first lines of a row on one baseline), 390×844 without page-level horizontal scroll,
  AC 5 and AC 8 by expanding a ticketed problem; antd lint, typecheck, 47 unit tests.

## Net effect against the handoff

Same behaviour and data; clearer wording for the folded group and the ticket field, and a single
alignment and spacing system across the Production errors tab.
