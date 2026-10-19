# ASSERT-19 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit. The owner's request for a token-based line-height system
is the approval that ui.md redline 1 asks for before the governed theme changes.

## What was wrong

Measured on the production build before the change:
- The theme set one `lineHeight: 1.27`. Under the compact algorithm, body text is 14 px, so it sat on a
  17.8 px line and was cramped when it wrapped.
- Ant derived every other line height on its own: tags at 1.67, 20 px card titles at 1.5 but 20 px lead
  text at 1.27, the 26 px page title at 1.4, and 40 px section titles at 1.27. Smaller text was set
  looser than body text, and headings followed no order.
- Components wrote `lineHeight: 1` (pass count, wordmark, the card's run-times footer) and `1.05` (the
  hero).
- The homepage diagram spaced its 14 px lines 26 apart and sized its boxes by hand.
- The Clerk sign-in card used Clerk's own scale (20.9/29.5 title, 16/22.2 labels).

## What changed

- **Scale** (`ASSERTCHECKS_STYLE`): one line height in px per type size, all multiples of 4.

  | Size | 14 | 16 | 20 | 26 | 30 | 40 | 76 |
  |---|---|---|---|---|---|---|---|
  | Line | 20 | 24 | 28 | 32 | 36 | 48 | 80 |

  Text is 1.4–1.5 times its size, and headings tighten as they grow. `lineHeightSingle: 1` covers
  single-line display text.
- **Ant tokens**: `lineHeight`, `lineHeightSM`, `lineHeightLG` and `lineHeightHeading1`–`5` are ratios
  derived from the table; body uses the 14 px line because compact renders body at 14 px. The
  button's `contentLineHeight*` come from the same table.
- **Where no token reaches**: `cardConfig` sets the card titles and `buttonConfig` the 16 px button
  labels, both passed to ConfigProvider. `clerkAppearance.elements` sets the Clerk card's title,
  labels, input, button and footer text.
- **Components**:
  - Text set at `fontSizeLG` (lead, "/ N passed", "No runs yet") takes `lineHeightLG`.
  - The pass count and the wordmark take `lineHeightSingle`, and the run-times footer loses its
    `lineHeight: 1`.
  - The fluid hero takes Heading 1's ratio but never a line tighter than Heading 2's (48 px at 40 px).
- **Diagram**: titles sit on the 28 px line and text on the 20 px line. Box heights are computed from
  their content and boxes are centred on one line, so the wide diagram is now 170 tall instead of
  230. In the tall layout, the two labels between the CI runner and AssertChecks sit outside the pair
  of lines. Before, "results + catalog" ran past the right edge at 390, as it still does on the live
  site.
- **Charter**: ui.md gains a "Line height" rule: the scale, its Ant mapping, the configs, and that a
  component setting its own `fontSize` sets the matching line height.

## AC results

Production build on port 63019, built-in browser, with a ticket-scoped project, check and test
member. One run with five cases (one failed, with wrapping text) was reported through the real
client. All of it was removed with the CLI afterwards, and the Clerk test user was deleted.

1. **One source — passed.** The theme-literal check passes. No numeric `lineHeight` appears in `src`
   outside `src/theme.ts` and the generated stylesheet.
2. **Every text on the scale — passed.** At 1440 and 390 on home, project, check and case, every
   visible element with its own text measured 14/20, 16/24, 20/28, 26/32, 40/48, 76/80 (40/48 for the
   hero at 390), or a single line equal to its size (pass count 40/40, wordmark 20/20). On login the
   page and the Clerk card text are on the scale too. The only exceptions are Clerk's own "Secured by
   Clerk" badge and the development-only "Development mode" badge.
3. **Controls keep their size — passed.** On the check page at 390, selects and buttons are 32,
   tags 22, tabs 36 and the header 52. `scrollWidth` equals the viewport on every page at both widths.
   No diagram text crosses its canvas.
4. **Checks and record — passed.** Typecheck, 38 unit tests, the build and antd lint pass. `before/`
   and `after/` hold the screenshots.
