# ASSERT-16 decisions

The owner confirmed each of these on 2026-10-19, after seeing the measured palette (`palette.md`).

## Colour roles

| Role | Value | Contrast |
|---|---|---|
| Theme colour: colorPrimary, links, selected tabs, focus, logo tile | `#3e4fea` | 5.98 on white, 5.56 on the page |
| Primary button | `#112c3e`; Ant derives hover and active | white text 14.45 |
| Body text | `#112c3e` | 13.43 on the page, 14.45 on white |
| Secondary text | `#5c728c`, adjusted from adsy's `#677f9b` (3.84 / 4.13) | 4.60 on the page, 4.95 on white |
| Default tag | background `#e2e6f8`, text `#112c3e` | 11.63 |
| Page background | `#f4f7f9` | — |
| Card background and header | `#ffffff` | — |
| Font and weights | unchanged | — |

The button colour is deliberately not the theme colour: adsy's buttons are navy, and its identity
colour is the indigo keyword highlight.

## Charter (`ui.md`)

The owner approved three changes:

1. **Tokens**: `ASSERTCHECKS_STYLE` at the top of `src/theme.ts` is the only place custom values are
   declared.
2. **Where components live**: Ant overrides, only when tokens cannot do it, go in
   `src/components/ant-overrides/`, one file per component, each listed in `ui.md`.
3. **Design source of truth**: add this ticket's palette.

Redlines are unchanged.

## Logo

The logo tile follows the theme colour, changing from `#3b5bdb` to `#3e4fea`. Its geometry and font
are unchanged.

## Not copied from adsy.com, and why

- Button height stays Ant's default, not 46–58 px, because this is a data-dense product.
- Card radius is 20, not 40.
- The green `#8cf08a` is not used for buttons or tags: in a results product it reads as "passed".
- Space Grotesk is not used: the owner kept the font.

## Items in the task text that belong to another project

These were mapped to their AssertChecks counterparts:

- the theme file stays `src/theme.ts`, not `src/theme/ant-theme.ts`;
- `brand.json` / `brand:build` / ui-guard / red line 12 do not exist here: the logo is
  `src/components/brand.tsx` and reads the theme colour;
- the address-bar colour is a `theme-color` meta taken from the style table;
- `ui:check` / `check` become typecheck, unit tests, build and antd lint;
- the pages checked are home, login, project, check and case.
