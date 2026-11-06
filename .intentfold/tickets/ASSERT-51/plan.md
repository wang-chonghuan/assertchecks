# ASSERT-51 plan

## What the code already says

- The interface font is one family string, `fontFamily` in `src/infui/tokens.ts`; `theme.ts` hands it to
  Ant's theme and to Clerk's appearance, and every `text` style takes it from there. Swapping that one
  value moves the whole app.
- The face is declared in `src/styles.css` (two variable woff2 subsets, latin and latin-ext, weights
  400–700) and the latin file is preloaded in `src/routes/__root.tsx`.
- Weights are tokens: body 400, heading 500, label 600, button 600, wordmark 700.
- `docs/index.html` (the product deck, a static page outside the app) mirrors the tokens and loads
  Space Grotesk from Google Fonts.

## Measured before choosing weights (departure from the proposed solution)

The ticket proposed raising the weights (body to about 450) on the assumption that Inter looks lighter
than Space Grotesk at the same weight. Measured in the browser on the real font files, at the same font
size, the vertical stem width as a share of the em and the ink of a sample word:

| Weight | Space Grotesk stem | Inter stem | Space Grotesk ink | Inter ink |
|---|---|---|---|---|
| 400 | 0.0800 | 0.0875 | 1.5 | 1.8 |
| 500 | 0.1025 | 0.1075 | 1.9 | 2.0 |
| 600 | 0.1150 | 0.1275 | 2.1 | 2.3 |
| 700 | 0.1250 | 0.1475 | 2.2 | 2.6 |

Inter is already at least as heavy at every weight the product uses, so the assumption was wrong and the
weights stay as they are. Raising them would make the text heavier than it is today, which the request
did not ask for.

## Route

1. Add Inter's variable files (latin, latin-ext; weight axis only) and its SIL OFL licence under
   `public/fonts/inter/`, from `@fontsource-variable/inter` 5.3.0.
2. `src/styles.css`: replace the Space Grotesk faces with Inter's, same subsets and ranges, weights
   100–900 as the file supports.
3. `src/infui/tokens.ts`: family `'Inter'` first in `fontFamily`; update the comment about where the
   font comes from. Weights unchanged.
4. `src/routes/__root.tsx`: preload the Inter latin file.
5. Remove `public/fonts/space-grotesk/`.
6. `docs/index.html`: the deck mirrors the tokens, so it switches to Inter too (it already loads its
   font from Google Fonts as a static page; that stays).

## Redlines

- ui.md redline 1 (retuning a value in `src/infui/`): the font family changes; the owner's request is
  the approval, recorded in a ticket comment. Weights are not retuned.
- ui.md redlines 2 and 3: no new library, no `.ant-*` overrides. Nothing in engineering.md or
  operations.md is touched.
