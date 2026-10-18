# ASSERT-7 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

- New public homepage at `/` (`src/routes/index.tsx`), shown signed in or out and containing no
  project data:
  - **Hero**: headline, plain-language subtitle and an entry button (Sign in, or Open my projects
    when signed in). Beside it is an illustrative "Example" environment card rendered with the real
    `CheckSummary` component from a fixed in-page sample, plus two failed cases with their failed Then.
  - **What it checks**: three cards (On time, Complete, Correct) and a five-step "How one run flows".
  - **Connect a project in four steps**: copyable commands taken from the current client and admin
    CLI.
  - **Report format**: the three push calls, the cases envelope, the partial-run and no-results
    commands, and the pass rule.
  - **What it does not do.**
- Signed-in landing moved from `/` to `/p` (`src/routes/_app/p/index.tsx`, same redirect to the last
  opened project). Sign-in and the in-app brand link now go to `/p`.
- `src/components/code-block.tsx`: copyable code block. Ant has only inline code; long lines scroll
  inside the block.
- `src/styles.css`: one media-query class so the header section links render server-side from the md
  breakpoint without a hydration flash.

## AC results

Preview on port 63007 against the shared database. AC1, AC2 and AC4 ran in an isolated headless
Chromium with a throwaway user and project (`ac7-tester@example.test`, `ac7-temp`), both deleted
afterwards; the database again holds only support@ and projects nsdk and bf.

1. **Signed-out homepage — passed.** With no session, `/` stayed `/`; Hero, "Three questions after
   every run", "Connect a project in four steps", "One fixed format, three calls" and "What it does
   not do" were all visible.
2. **Entry button — passed.** Signed out, the hero button's href is `/login` and clicking it opened
   `/login`. Signing in there landed on `/p/ac7-temp`. Opening `/` while signed in still showed the
   homepage, and "Open my projects" opened `/p/ac7-temp`. The in-app browser, signed in as
   support@, likewise went `/` → Open my projects → `/p/nsdk`.
3. **Commands accepted by the client — passed.** With the client downloaded from the preview, a fake
   token and `ASSERTCHECKS_ORIGIN` set to the preview, the four commands shown (`start --version`,
   `report --playwright --catalog --version`, `start --cases`, `report --error`) each ended with
   "HTTP 404 unknown token" and no option or usage error.
4. **Mobile and colour scheme — passed locally.** At 390×844 with dark emulation, `scrollWidth` was
   390, and no element outside code blocks extended past the viewport. The light theme renders
   consistently in dark emulation, with text readable throughout (full-page screenshot inspected).
   The production part is checked after deploy in cap4.

Mechanical defence: typecheck, 21 unit tests and build passed; ips-antdesign lint found 0 issues.

## Deviations

- The proposed solution used client-side links; the entry buttons are plain `href` buttons instead,
  to avoid nesting a button inside a link.
- The homepage hard-codes the production origin for the `curl` line, the same value as the client
  default and the README.

## Environment

Web port 63007. No env keys and no migrations.

## Residual

ASSERT-8 adds schema links and the dry-run command to the "Report format" section.
