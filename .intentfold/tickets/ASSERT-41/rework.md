# ASSERT-41 rework

Two rounds after the frozen handoff.

## Round 1 — 50d4805

Ask: "整个这个app里的间距都很有问题，改了好几次都没改对，比如刚那个卡片和下面的卡片的两个卡片的间距，太小。而且很多行间距也不对。你调查一下，给我个方案，如何token化这个间距，然后让所有用到间距的地方必须取token", then "所有token放到infui这个目录下，目录位置你自己定，以后我做的app的token化的东西，都要放到这里".

- Cause found: no spacing scale of our own. Ant's compact algorithm collapsed 13 margin/padding names
  into 5 values (`margin` and `marginSM` both 8 px), and Flex's `small`/`middle` gaps were 4/8 px.
- `src/infui/` holds every UI value: `tokens.ts` (table, spacing roles inline 4 / stack 8 / group 16 /
  block 24 / section 48, drawn sizes), `theme.ts` (moved from `src/theme.ts`), `page-frame.ts` (moved
  from components). 128 spacing/type uses migrated; `pnpm check:infui` enforces it and joined the
  mechanical defence; charter ui.md and engineering.md updated.
- Rechecked: diagram card to the next card 16 px (was 8), section title to content 24 px; homepage,
  project, check pages at 1440×900 and 390×844, no horizontal scroll.

## Round 2 — e4bf93d

Ask: "然后处理字体的问题，字体必须建立一个10个token以内的集合，所有字的样式都按语义取一个token，每个token要有：字体，字号，字重，颜色。几个属性。…然后当前的body颜色太淡。还放在infui里"

- Ten text styles in `src/infui/tokens.ts` — display, heading1–3, lead, body, label, caption, code,
  eyebrow — each with family, size, px line height, weight and colour. 49 `secondary` and 12 `strong`
  uses replaced; descriptions became body (dark text colour), times/authors/hints caption; titles take
  their look from their style. `check:infui` enforces it; charter ui.md lists the styles.
- Rechecked: computed styles on the homepage (descriptions 14/20 400 #112c3e, caption grey), project
  and check pages; typecheck, 61 tests, build.

Net effect against the handoff: AC 1–3 still hold; the app's spacing and text now come only from
`src/infui`.
