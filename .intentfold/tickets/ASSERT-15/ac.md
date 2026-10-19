# ASSERT-15 acceptance checks

## AC1 Content design brief exists
Check: read `content-design.md` in this directory.
True when: it has the job story with its evidence, the one question, the priority guide and the cut/moved table.

## AC2 The first screen answers and offers both starts
Check: at 1440×900 on the preview, signed out, read what is visible without scrolling.
True when: the headline and its sentence, "Copy for your agent" and "Sign in" are all in view.

## AC3 Less on the page; cut items gone, moved items collapsed
Check: measure body words, visible code blocks and height against the baseline (834 words, 8 blocks,
4,632 px); search the page for each cut element; check the reference panel's state.
True when: all three numbers are clearly lower, no cut element appears, and the format reference is
collapsed by default.

## AC4 Agent copy still complete
Check: `pnpm test`, and click "Copy for your agent" on the preview.
True when: the guide test passes, and the clipboard holds every step, code sample (including the
moved partial-run and no-results commands), both format links and every call.
