# ASSERT-16 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit. It followed the ips-design-to-antd process, which
appeared during the work; its literal and contrast scripts were used for the checks below.

## What changed

- **`src/theme.ts`**:
  - A new `ASSERTCHECKS_STYLE` table declares every custom value with a comment each: the colours
    for primary, button, text, secondary, tertiary, placeholder, page, card, header and tag; plus
    `none`, `noShadow`, radius 8, card radius 20 and pill 999.
  - The exported `theme` reads only from that table. Global tokens: `colorPrimary`, `colorLink`,
    `colorInfo`, the `colorText*` family, `colorBgLayout`, `colorBgContainer`, `borderRadius` and
    `borderRadiusLG`.
  - Component tokens:
    - Button: `algorithm: true`, button colour, `colorText`, pill radii, no shadows.
    - Tag: lavender background, navy text, transparent border, pill radius.
    - Card: borderless.
    - Input, Select and Segmented: pill radii.
    - Layout: page body, white header.
    - Table: row hover in the page colour.
    - Tabs and Menu: secondary item colour.
- **Theme bypasses**:
  - The homepage root container now uses `colorBgLayout` (it was `colorBgContainer`).
  - The app header no longer paints its own white, so Layout's `headerBg` applies.
  - The login page now has the page background (it showed the body's white).
- **`src/routes/__root.tsx`**: `<meta name="theme-color">` from `ASSERTCHECKS_STYLE.headerBg`
  (white, matching the header).
- **`charter/ui.md`**: the three edits the owner approved (`decisions.md`):
  - the table is the single declaration place;
  - the `src/components/ant-overrides/` rule (no overrides were needed);
  - the palette as a design source.
- **Ticket records**: `palette.md` (measurements), `decisions.md` (roles and approvals),
  `reference/` (adsy screenshots), `after/` (screenshots and `measured.json`).

## Palette and roles (confirmed by the owner)

| Role | Value |
|---|---|
| Theme colour: links, selected tab, ink bar, focus, logo tile | `#3e4fea` |
| Primary button | `#112c3e`, white text |
| Body text; default and text buttons | `#112c3e` |
| Secondary, tertiary and placeholder text | `#5c728c` |
| Default tag | `#e2e6f8` background, `#112c3e` text |
| Page background | `#f4f7f9` |
| Card and header | `#ffffff` |

## Contrast (WCAG 2.x, `contrast.mjs`)

| Pair | Ratio |
|---|---|
| Body `#112c3e` on page / on card | 13.43 / 14.45 |
| Secondary `#5c728c` on page / on card (adsy's `#677f9b`: 3.84 / 4.13) | 4.60 / 4.95 |
| Theme `#3e4fea` on card / on page; white on it | 5.98 / 5.56; 5.98 |
| White on button `#112c3e` | 14.45 |
| Tag text on tag | 11.63 |

Placeholder text was also moved from `#677f9b` to `#5c728c` (4.13 → 4.95 on white).

Not a palette pair, and not changed: Ant's semantic status tags. Failed is `#ff4d4f` on `#fff2f0`,
2.99:1, and it was the same before this ticket. Changing the error and success colours is a separate
decision for the owner.

## Not copied, and why

- Button height stays Ant's 40 px (adsy uses 46–58), because the product is data-dense.
- Card radius is 20 (adsy uses 40), as the owner specified.
- Green `#8cf08a` is not used for buttons or tags: next to status colours it reads as "passed".
- The font is unchanged (adsy uses Space Grotesk 18 px); the owner kept the product's own.
- The default button border stays Ant's `#d9d9d9`, not adsy's 1 px navy outline; it was not in
  the confirmed roles.
- adsy's dark navy sections and green feature cards are page design, not theme.

## AC results

1. **Measured reference and palette — passed.** At 1440 px, with the cookie banner declined, there
   are 4 screenshots (hero, feature cards, metric cards and tags, review cards). `getComputedStyle`
   data covers body/h1/highlight, 11 button styles, 2 tag styles, 7 card styles, and backgrounds and
   text colours ranked by count and painted area (`palette.md`).
2. **One declaration table — passed.** `check-theme-literals.mjs src/theme.ts ASSERTCHECKS_STYLE`:
   "ok: every colour literal in src/theme.ts is inside ASSERTCHECKS_STYLE". `ui.md` now names the
   table as the only place.
3. **Measured colours match at 1440 and 375 — passed.** These come from the local production build
   (`node .output/server/index.mjs`), with a throwaway project, check, run and member that were
   removed afterwards with the CLI. The same values were measured at both widths:

   | Element | Measured |
   |---|---|
   | Primary button | `#112c3e`, white text, radius 999, no shadow, 40 px tall |
   | Default and text buttons | text `#112c3e`, radius 999 |
   | Link-type button and links | `#3e4fea` |
   | Selected tab | `#3e4fea`; ink bar `#3e4fea`; unselected `#5c728c` |
   | Body text | `#112c3e` |
   | Secondary text | `#5c728c` |
   | Tag "smoke" | `#e2e6f8` / `#112c3e`, transparent border, radius 999 |
   | Layout and page behind cards | `#f4f7f9` |
   | Header | `#ffffff` |
   | Card | `#ffffff`, radius 20, transparent border, no shadow |
   | Input and Select radius | 999 |
   | Logo tile | `#3e4fea` |
   | theme-color | `#ffffff` |

   `scrollWidth` equals the viewport on home, login, project, check and case at 1440 and at 375.
4. **Report and checks — passed.** Typecheck, 38 unit tests and the production build passed;
   ips-antdesign lint found 0 issues; the literal check passed.

## Deviations

- The task text was written for another project. Its counterparts here are listed in
  `decisions.md`: theme file, brand pipeline, guard, check commands and pages.
- `ticket.json` and `ac.md` were written at handoff rather than at setup. They restate the live
  ticket's criteria unchanged.
- The homepage's blue preset "End-to-end assertion monitoring" tag still shows Ant blue. It is not
  restyled here because ASSERT-15, awaiting review, removes it. Merge ASSERT-15 first.

## Environment

Local production server on port 63016, still running for review. No env keys and no migrations.

## Residual

- Status-tag contrast, the Ant semantic colours (above).
- Optionally add the literal check to `ui.md` Tools so it runs as a mechanical defence; this needs
  the owner's approval.
