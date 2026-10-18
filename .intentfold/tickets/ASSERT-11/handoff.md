# ASSERT-11 handoff

This work came through an open development phase; this file records what was delivered and
verified, not which tool produced each edit.

## What changed

- **Brand mark** (`src/components/brand.tsx`): a brand-colour tile with a check, followed by the
  bold wordmark ("Assert" in the brand colour, "Checks" in the text colour). The default size is
  20px (heading-4 token), up from the earlier 16px header text; the `large` size is 30px for the
  sign-in card. The homepage header and footer, the app header and the sign-in page use it. Each
  links to the homepage, except the footer.
- **Back to the homepage** (`src/routes/_app.tsx`): a "Home" button (icon only on small screens)
  in the header of every signed-in page, and the logo now links to `/` instead of `/p`.
- **Plain hero**: the headline "Know every assertion still holds." is a single colour; the
  gradient text is gone.
- **One connection section** (`src/routes/index.tsx`): "Connect a project" holds everything that was
  spread over Connect and Report format.
  - A highlighted "Let your coding agent connect it" callout with a large **Copy for your agent**
    button and links to the two format documents.
  - Five steps: create a check, write the catalog, dry run, report from CI (with the partial-run
    and no-results commands), open your project.
  - The report-format block: the four calls, the cases format and the pass rule.

  The separate Report format section and its header link are gone.
- **One source for page and copy** (`src/lib/connect-guide.ts`): steps, commands, format links and
  calls live here. The page renders them, with `backticks` shown as inline code, and `agentPrompt()`
  turns the same data into Markdown for the clipboard. The copied text names the origin, mentions
  the `assertchecks` skill's cap0, and asks to replace the example values and never commit the
  token.

## AC results

Preview on port 63011. Signed-in pages were viewed read-only with the in-app browser's existing
localhost session; the signed-out pages were viewed in a fresh headless browser. No data was
created.

1. **Larger brand mark everywhere — passed.** The homepage header wordmark computes to 20px (was
   16px) and the sign-in card to 30px (screenshot `login.png`). The app header shows the same mark.
2. **Back to the homepage — passed.** The header on the project, check and case pages has a "Home"
   link to `/`. Clicking it on a case page landed on `/`, still signed in (the homepage showed
   "My projects").
3. **Plain hero headline — passed.** The `h1` has `background-image: none` and colour
   `rgba(0, 0, 0, 0.88)`, with no child elements.
4. **One connection section and copy — passed.**
   - The homepage sections are now the hero, `checks`, `connect` and "What it does not do".
   - Clicking "Copy for your agent" showed "Copied. Paste it to your coding agent." and put 5,403
     characters of Markdown on the clipboard. That text has the five step headings, all 8 code
     blocks shown in the section verbatim, both format URLs and the dry-run command.

At 390 px wide nothing extends past the viewport. Mechanical defence: typecheck, 34 unit tests and
build passed. ips-antdesign lint found 0 issues.

## Deviations

- The copy button sits in a highlighted callout at the top of the section, with the format links
  beside it, rather than among the steps.
- A dry-run step was added as step 3, so there are five steps instead of four.

## Environment

Web port 63011. No env keys and no migrations.

## Residual

None.
