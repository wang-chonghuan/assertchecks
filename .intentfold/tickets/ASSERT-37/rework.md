# ASSERT-37 rework

Four rounds after the frozen handoff.

## Round 1 — 89f3fd3 (skill: narrative-skills 4e7d2e3)

Ask: "改改，一定从用户好认知的角度", after "但是这样太复杂了，增加用户认知负担，用户心理其实只有，我这个产品有啥bug，挂单子了吗，解决了吗，别的对用户都是负担"

- A bug is a failing case of the project in any environment, with three states: needs a ticket, in
  progress, fixed (every environment that ran it passed twice in a row since its newest ticket).
  Failing again after a fix means it needs a ticket again, naming the earlier ticket.
- Project Tests tab: one Bugs list (needing a ticket, then in progress; fixed in the last two weeks
  folded). The by-ticket view, per-environment states, run counts, "passed once" and "Recurred" are
  gone. Check page: status and ticket key; case page: one sentence and its tickets.
- Copied reports, README and cap7 use the same states. The live ticket's scope and AC 2–5 were
  rewritten to match, with a ticket comment.
- Rechecked: unit tests for the three states; the list, check and case pages on real runs at
  1440×900 and 390×844.

## Round 2 — 250e6d3

Ask: "你这个sandbox项目，给我放到我的 chonghuan.wang@narrativebanking.com可见的项目上吧，别搞那个clerk测试项目了，我不想切换账号，你就创造一个sandbox项目你测试开发用"

- A standing project `sandbox` (checks DEV and PROD, BF workspace as error source) with the owner and
  the agent's `sandbox+clerk_test@example.com` as members; tokens in `.credentials.local`. The
  acceptance scenario was replayed there; the `assert-37` projects and their test user were removed.
- operations.md: acceptance uses `sandbox`; ticket-scoped projects only when a check needs its own.

## Round 3 — b2a37d0

Ask: "这里行间距太小了，你这个行间距没token化吗，没用定制过样式的antd组建吗"

- The Bugs list was hand-built from Flex and Divider with no row padding; it is now the themed antd
  Table like the other lists. Rechecked: row padding 8 px, desktop and phone.

## Round 4 — 228dca8

Ask: "Approved: change the Select dropdown radius in theme.ts back to the normal card radius; keep the pill shape on the selector itself."

- `theme.ts`: Select `borderRadiusLG` is the card radius, so the project selector's dropdown is no
  longer a circle; the field stays a pill. Rechecked: dropdown 12 px, field 999 px.

## Net effect against the handoff

Same data model, links, API, client and errors behaviour; the interface answers only "which bugs, is a
ticket on it, is it fixed", acceptance lives in the owner-visible `sandbox`, and the Select dropdown
radius is fixed.
