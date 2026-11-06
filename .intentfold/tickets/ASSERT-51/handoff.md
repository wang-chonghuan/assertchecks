# ASSERT-51 handoff

## What changed

- The interface font is Inter instead of Space Grotesk. `src/infui/tokens.ts` `fontFamily` now starts
  with `'Inter'`; every text style, Ant's theme and Clerk's sign-in widget take it from there.
- `src/styles.css` declares Inter's two variable subsets (latin, latin-ext; weight axis 100–900), self-hosted
  under `public/fonts/inter/` with its SIL OFL licence, from `@fontsource-variable/inter` 5.3.0.
  `src/routes/__root.tsx` preloads the latin file. `public/fonts/space-grotesk/` is removed.
- Weights are unchanged (body 400, headings 500, labels and buttons 600, wordmark 700).
- `docs/index.html` (the product deck, which mirrors the tokens) uses Inter too; as before, it loads its
  font from Google Fonts because it is a static page outside the app.
- `src/components/automatic-tickets.tsx`: the "Changed by …" caption keeps its date on one line; with
  the narrower font it broke inside the date on phones.

## AC results

1. **Inter everywhere, no Space Grotesk — passed.** Signed in as the sandbox account on port 63051:
   headings, buttons, tags, tabs and the wordmark compute to `Inter, …`; `document.fonts` holds only
   Inter faces (loaded); the homepage, login, checks and errors pages render in Inter (screenshots).
   No Space Grotesk reference remains in `src`, `public` or `docs`.
2. **Served from our own origin — passed.** The only font request on the errors page is
   `http://127.0.0.1:63051/fonts/inter/inter-latin.woff2`; none to Google or another host. The build
   output carries `public/fonts/inter/`.
3. **Not thinner — passed.** Measured on the real font files at equal size, Inter's stems are thicker
   than Space Grotesk's at every weight in use (400: 0.0875 vs 0.080 em; 500: 0.1075 vs 0.1025; 600:
   0.1275 vs 0.115; 700: 0.1475 vs 0.125; capital I likewise). Before/after screenshots at 1440×900 and
   390×844 (homepage, login, checks, errors) show no text lighter than before. One nuance, first in Check:
   Inter's capitals are wider, so all-caps titles at 500 (DEV, PROD) spread their ink a little more
   (ink per area 0.293 vs 0.305) and can read a touch lighter despite thicker strokes.
4. **Monospace unchanged — passed.** An expanded error's stack (`pre`) computes to
   `SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace`, the unchanged
   `fontFamilyCode`.

Mechanical defence (`pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`): passed, 79 tests.
Ant lint: no failures.

Screenshots (git-ignored): `/Users/yong/work/assertchecks-ws/assertchecks/.intentfold/tmp/ASSERT-51/`
(`before-*` and `after-*`, plus `after-errors-390-v2.png` after the date fix).

## Deviations

- The proposed solution suggested raising the weights (body to about 450). Measurement showed Inter is
  already at least as heavy at every weight in use, so the weights stay; raising them would have made
  the text heavier than today. Explained in plan.md.
- The date-wrap fix in the automatic-tickets caption was not planned; the owner-eye review found it.

## Environment

- Port: web 63051.
- Env keys: none added, changed or removed.

## Residual

- `body` itself still computes to the browser default (Times); Ant applies the font inside its own
  containers, so nothing visible uses it today. Unchanged from main.

## Check

1. Checks page DEV/PROD card titles: all-caps titles at weight 500 read a touch lighter than before
   because Inter's capitals are wider, although the strokes are thicker. If you want them heavier, the
   heading weight can go from 500 to 550, which also makes every other heading heavier than today.
2. Homepage hero: the headline, subtitle and bullets are as heavy as before but Inter is slightly
   narrower, so lines end a little earlier and may feel marginally smaller.
3. Production errors tab on a phone: the overall look in Inter, and the "Changed by …" date on one line.

## Decided for you

- Weights unchanged, because Inter's strokes measured thicker at every weight in use.
- The product deck switched to Inter too, still loading from Google Fonts as before.
- Inter's optical-size axis is not used; the weight-only files match the previous setup.
- The change date in the automatic-tickets caption no longer breaks across lines.
