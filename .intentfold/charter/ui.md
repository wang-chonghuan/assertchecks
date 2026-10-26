# UI Requirements

Binding on every UI change. **UI work follows this file strictly** — the agent does not invent
alternatives to what is written here. Section shape is fixed by `.intentfold/readme.md`.

*Seeded by IntentFold cap1 on 2026-10-17. The owner chose Ant Design 6 for this project instead of
the template's Astryx/StyleX or Tailwind stacks.*

## Contract

**Styling stack**

Ant Design 6 core components and `@ant-design/icons`, composed per the ips-antdesign skill. No
ProComponents (no stable release supports antd 6), no Umi, no Tailwind, no second component or
styling system. Ant Design Pro pages are layout references only.

**Where components live**

Pages under `src/routes/`; shared presentational pieces under `src/components/`: `brand.tsx` (the
product mark), `status.tsx` (outcome/status tags and notices), `check-summary.tsx` (the environment
card shared by project cards, the check page and the homepage example), `how-it-works.tsx` (the
homepage diagram), `production-errors.tsx` (the project page's Production errors tab, with its
30-day bars, which antd has no component for), `error-log.tsx` (an error's output as a code block with a copy button), `tickets.tsx` (the attach dialog, a ticket's
link and state, and the project's tickets grouped by ticket) and the rest listed here; the content width and side gutter every page and section uses are `src/infui/page-frame.ts`.
`src/styles.css` holds structural rules only: the self-hosted font face and the homepage's breakpoint
switches. Prefer an antd component or documented composition over a new component. An Ant component
is overridden only when tokens cannot do it, in `src/components/ant-overrides/`, one file per
component, each listed here.

**Tokens**

`src/infui/` holds every UI value, as in all of the owner's apps: `tokens.ts` is the single table
(`ASSERTCHECKS_STYLE`: colours, type sizes with their px line heights, radii, the spacing scale, page
frame and the fixed sizes of drawn things), `theme.ts` builds the Ant theme, ConfigProvider settings and
Clerk appearance only from it, and `page-frame.ts` the content column. No value is declared anywhere
else and no colour literal appears outside it.

- Spacing comes only from `space`, named by what it separates: `inline` 4 (an icon and its label),
  `stack` 8 (lines of one block, tags or buttons in a row), `group` 16 (cards beside or below each
  other, rows of a list), `block` 24 (a section title and its content), `section` 48 (sections of a
  page). Ant's own margin and padding tokens are collapsed by the compact algorithm (`margin` and
  `marginSM` are both 8 px) and stay inside Ant's components; pages and components never use them or
  Flex's named gaps.
- Every piece of text takes exactly one `text` style, by what it is, and each style fixes family, size,
  line height (px, a multiple of 4), weight and colour. There are ten, no more: `display` (the homepage
  headline), `heading1` (section titles), `heading2` (page titles), `heading3` (card and block titles),
  `lead` (an introduction under a headline), `body` (reading text and descriptions), `label` (a name,
  a count, the selected item), `caption` (times, authors, hints, empty values), `code` (IDs, commits,
  commands) and `eyebrow` (the kicker above a section title). A title's look comes from its style,
  not its heading level; `secondary` and `strong` are not used. Drawings that lay out text use
  `lines`; single-line display text keeps `lineHeightSingle`. Card titles and button labels get theirs
  through the configs in `theme.ts`; the product mark has its own sizes in `brand`.
- Colours come from theme tokens (`theme.useToken()`), which take theirs from the table.

`pnpm check:infui` fails on any page or component that sets spacing, a text style or a colour another
way.

**Layout and responsive**

Every page works at the canonical viewports in `operations.md` (1440×900 and 390×844) without
horizontal page scroll; wide tables scroll inside their card. Times are shown in UTC with the zone
label. The interface language is English.

**Design source of truth**

Existing pages, the antd documentation for the installed version, and the adsy.com palette measured
in ASSERT-16 (`.intentfold/tickets/ASSERT-16/palette.md`).

## Tools

```bash
node <ips-antdesign-skill>/scripts/antd.mjs lint ./src
```

```bash
node <ips-antdesign-skill>/scripts/antd.mjs info <Component>
```

## Guidance

**Choosing components.** Reach for a custom component only when the library genuinely has nothing
that fits — not because the official one needs configuring, and not because writing one looks faster.
"There is no equivalent" is a claim to check against the docs, not to assume.

**Choosing a token.** Status colours use antd semantic tokens (`colorSuccess`, `colorError`,
`colorWarning`, `colorInfo`) or Tag presets; neutral fills use `colorFill*`. A missing token is a stop.

**Interaction states.** Every data view has an explicit empty state; missing values render as an
em dash or "not recorded", never as zero or passed. Unauthorized or missing objects render the
shared 404.

**Responsive descriptions.** A responsive `Descriptions` `column` lists every breakpoint, otherwise
antd falls back to its default column count.

**Content and tone.** Short, factual English labels; outcomes are Passed, Failed, Incomplete,
Running and Timed out.

## Redlines

1. **Changing the governed theme** — adding, renaming, removing or retuning a value in
   `src/infui/` — not without the human's explicit approval.
2. **Adding another component library, ProComponents, Umi, Tailwind or a CSS-in-JS system other than
   antd's** — forbidden outright.
3. **Overriding antd internals with `.ant-*` selectors or `!important`** — forbidden outright.
