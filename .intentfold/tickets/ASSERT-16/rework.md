# ASSERT-16 rework

The first delivery is frozen in `handoff.md`. After it, the branch was rebased onto ASSERT-15 so the
homepage was tuned on its final copy, and the owner asked for nine rounds. Each round is one commit
whose message is the owner's request. Every round was checked on a local production build
(`node .output/server/index.mjs`), with throwaway data removed through the admin CLI.

1. **f2f43d0 — compact redesign** ("ui设计非常丑陋，尤其是间距…我要紧凑风").
   - Ant's compact algorithm. Buttons are compacted once, matching inputs.
   - Card padding 16 and radius 12 (was 20).
   - A 52 px header aligned to the content column.
   - Smaller headings, a single wrapping stats row, small empty states, equal-height cards, a narrow
     case label column and a tighter homepage.
2. **f7cec3c — "How it works" diagram** ("Connect a project…全部不要，改放到 copy md…用svg画一个原理图").
   - The section is an SVG diagram (wide and tall variants), plus the "Copy for your agent" callout.
   - Steps, commands and the format reference now exist only in the copied Markdown.
   - `CodeBlock` was removed.
3. **98f9543 — adsy typography** ("字体，字重，字号，全部用adsy.com上的…太细小了").
   - The type was measured on adsy.com: Space Grotesk 400–700, self-hosted under the SIL OFL.
   - Body and buttons 16 px, small text 14, lead text 20.
   - Headings 76 / 40 / 30 / 26 / 20; headings weight 500 (the hero 400); buttons 600.
   - Line height 1.27, statistics 30/500, controls 32 px.
4. **d044b3d — copyright footer** ("home页面最下面一行是啥…写个copyright"). The leftover client-script
   link is replaced with "© 2026 AssertChecks. All rights reserved."
5. **654f70f — no footer logo** ("底部的logo也不用要"). Only the centred copyright line remains.
6. **b43c40b — environment card redesign** ("这个卡片很丑…失败的cases不要留").
   - Three levels: passed out of ran with the case total, a stacked bar with a dotted legend, and
     the run times under a rule.
   - The outcome tag shows only for incomplete or timed-out runs.
   - The homepage example lists no failed cases.
   - Unused `Statistic` tokens, `TriggerTag` and `scheduleText` were removed.
7. **e79b0a8 — card vertical rhythm** ("这个卡片里的行间距有问题").
   - Measured before: 25 px under the title and 4 px everywhere else.
   - Now on a 4 px grid: 12 under the title, 12 to the bar, 8 to the legend, 16 before the rule,
     4 between the time lines.
   - Notices take space only when present.
8. **b079dd3 — one page frame** ("左右padding也不对…没token控制吗").
   - Measured before: the hero sat at 144 px and the rest at 128 px at 1440; 24 px and 8 px at 375.
   - `ASSERTCHECKS_STYLE` now declares width 1200 and a 16–32 px gutter, applied everywhere through
     `src/components/page-frame.ts`.
   - Measured after: 152 px on every band at 1440, and 16 px at 375.
9. **0eebab9 — charter** ("合并上线吧，ui.md 也一起改"). `ui.md` lists the current components (adds
   `how-it-works.tsx` and `page-frame.ts`, drops `code-block.tsx`), names type and the page frame
   among the table's values, and states what `styles.css` holds.

## Checks rerun

Repeated after the rounds that changed them:

- the measured colours at 1440 and 375;
- no horizontal page scroll;
- the theme-literal check;
- 38 unit tests and the antd lint.

The colour palette and roles from the first delivery are unchanged.

## Net effect against the handoff

The same adsy colour palette, now with:

- adsy's typeface and type scale;
- compact density;
- one declared page frame;
- a diagram in place of the in-page connection steps;
- a redesigned environment card;
- a copyright-only footer.

The card radius moved from the brief's 20 to 12 for compact density.
