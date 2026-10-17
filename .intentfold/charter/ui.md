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

Pages under `src/routes/`; shared presentational pieces under `src/components/` (`status.tsx` for
outcome/status tags and cells, `brand.tsx` for the product name). Prefer an antd component or
documented composition over a new component.

**Tokens**

`src/theme.ts` is the single theme authority (antd seed/alias tokens plus the fixed `cssVar.key`).
Components read values with `theme.useToken()`; colours, spacing, radii and sizes come from tokens,
not literals. The product name and its brand colour live only in `src/components/brand.tsx`.

**Layout and responsive**

Every page works at the canonical viewports in `operations.md` (1440×900 and 390×844) without
horizontal page scroll; wide tables scroll inside their card. Times are shown in UTC with the zone
label. The interface language is English.

**Design source of truth**

Existing pages and the antd documentation for the installed version.

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
   `src/theme.ts` — not without the human's explicit approval.
2. **Adding another component library, ProComponents, Umi, Tailwind or a CSS-in-JS system other than
   antd's** — forbidden outright.
3. **Overriding antd internals with `.ant-*` selectors or `!important`** — forbidden outright.
