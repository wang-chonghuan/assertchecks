# ASSERT-15 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit. The ips-content-design skill guided it: cap2 reviewed
the live page, cap1 produced the structure and cap3 the words. The resulting brief is
`content-design.md` in this directory.

## What changed

- **Hero** (`src/routes/index.tsx`):
  - The "End-to-end assertion monitoring" label is gone.
  - The subtitle is now one sentence: "Your project runs its end-to-end tests and reports every
    run. AssertChecks shows whether each one arrived on time, ran in full, and which assertion
    failed."
  - The two starts are Sign in / Open my projects and "Copy for your agent", which replaces "How
    to connect".
  - Two trust facts remain ("Never runs your tests", "Never holds your product credentials"); the
    internal-sounding "Push only" is cut.
- **What it checks**: titled "Every check answers three questions", with On time?, Complete? and
  Correct? at one sentence each. The healthchecks.io sentence and the "How one run flows" diagram are
  cut.
- **Connect**: a one-sentence intro. The callout line reads "Copies every step below as Markdown,
  ready to paste". The five steps keep their code but are one or two sentences each. Every other
  part of the report format sits in a "Report format reference" panel, collapsed by default: the
  four calls, the cases format, the pass rule, and the partial-run and no-results commands (moved
  out of step 4).
- **Removed**: the "What it does not do" section ("Show history yet" and "Send alerts yet" reported
  absence; the real boundaries are the trust facts).
- **One source** (`src/lib/connect-guide.ts`): shorter step texts and `FORMAT_INTRO`. A new
  `FORMAT_SAMPLES` holds the two moved commands, which `agentPrompt()` still copies;
  `tests/connect-guide.test.ts` now derives those samples too.

## AC results

Preview on port 63015, viewed in a fresh headless Chromium, signed out.

1. **Brief exists — passed.** `content-design.md` has the job story with its evidence (the owner's
   requests, readers marked as an assumption to confirm with BF), the question, a 7-row priority
   guide, the cut/moved table and the tests.
2. **First screen answers and offers both starts — passed.** At 1440×900 the headline, its
   sentence, "Copy for your agent" and "Sign in" are all within the first 900 px (screenshot
   `after-first-screen.png`).
3. **Less on the page — passed.**

   | | Before (production) | After |
   |---|---|---|
   | Body words | 834 | 341 |
   | Visible code blocks | 8 | 5 |
   | Page height | 4,632 px | 3,012 px |

   None of the cut texts appears ("End-to-end assertion monitoring", "Push only", "healthchecks.io",
   "How one run flows", "What it does not do", "Show history yet", "How to connect"). The reference
   panel loads collapsed, with its commands hidden, and opens on click. At 390 px there is no
   horizontal overflow.
4. **Agent copy still complete — passed.** `pnpm test` passed 38 tests, including the guide test,
   which now covers the moved samples. Clicking "Copy for your agent" put 4,789 characters on the
   clipboard: 5 step headings, the partial-run and no-results commands, both format URLs and the
   dry-run command.

Mechanical defence: typecheck, 38 unit tests and build passed. ips-antdesign lint found 0 issues.

## Deviations

None from the brief.

## Environment

Web port 63015. No env keys and no migrations.

## Residual

Confirm the job story with real readers: the brief proposes watching BF's first connection from the
homepage.
