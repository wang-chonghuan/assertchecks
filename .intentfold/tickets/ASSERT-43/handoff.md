# ASSERT-43 handoff

## What changed

- `docs/index.html`: a 16-slide product deck in English, light mode, one file with inline SVG.
  1 Title · 2 The problem · 3 How it works · 4 How a run is judged · 5–7 Project, check and case pages
  · 8 Failure to ticket · 9 Production errors pipeline · 10 Production errors page · 11 The skill
  · 12 People define correct · 13 CI · 14 Agent and client · 15 Get started · 16 Why it matters.
- `docs/assets/*.jpg`: seven screenshots of NSDK on assertchecks.com (DEV run #93, production errors
  read 2026-10-27), emails masked to "teammate".

## AC results

1. Pass. Served on port 63043: 16 slides; arrows, buttons and `#n` work.
2. Pass. Every slide rendered by headless Chrome at 1360×780 and checked; a phone in landscape
   (812×375) shows the slide edge to edge, with swipe instead of buttons.
3. Pass. Screenshots are real NSDK data; the signed-in email is replaced by "teammate".
4. Pass. Slides 11–15.
5. Pass. No h1–h3 or diagram title contains a comma.

## Deviations

- 16 slides instead of about 10, after the owner asked for usage, skill and CI slides.
- The skill's install command is not shown: narrative-skills is a private repository.

## Environment

Static only. No env keys, no migration, nothing deployed.

## Residual

- Publishing: the repository is public, so merging puts NSDK case titles, error messages, endpoint
  names (`/readyz`, `/api/money/metrics`, `nsdk-backend`) and the PROD failure count on GitHub.
- A phone in portrait shows the slide small; turn it sideways.

## Check

1. Open `docs/index.html` in a browser (or `python3 -m http.server -d docs`) and step through with →.
