# ASSERT-43 plan

## Ask

An English product deck in `docs/` on main: light mode, about ten slides, little text, SVG diagrams
for how it works, real screenshots from NSDK's DEV environment, plus how to use it (the assertchecks
skill and CI) so a reader sees why it matters and knows how to start.

## Route

1. Screenshots from https://assertchecks.com/p/nsdk as the owner (emails masked to "teammate"): the
   project page, the DEV check page and its failed cases, case E2E-103, the production errors tab.
   Cropped into `docs/assets/`.
2. One self-contained `docs/index.html`: a 1280×720 stage scaled to the window, keyboard, buttons,
   swipe and `#n` links, print gives one slide per page. Colours and type mirror `src/infui/tokens.ts`
   as CSS variables declared once at the top.
3. Facts taken from the code: the pass rule and calls in `src/lib/connect-guide.ts`, the noise
   categories in `src/server/telemetry.ts`, the CI template and capability list of the skill.
