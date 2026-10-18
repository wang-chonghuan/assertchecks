# ASSERT-11 acceptance checks

Preview on port 63011; signed-in checks use the in-app browser's existing localhost session
read-only, or a throwaway user removed afterwards.

## AC1 New, larger brand mark everywhere

Check: open `/`, `/login` and a project page; measure the brand's rendered font size before
(16px header text) and after.
True when: all three show the new mark (icon plus wordmark) and its text is clearly larger than 16px.

## AC2 Back to the homepage from every signed-in page

Check: on a project page, a check page and a case page, use the header's Home control.
True when: each lands on `/` (the homepage), still signed in.

## AC3 Plain hero headline

Check: computed style of the hero `h1` and its children.
True when: no element uses a gradient background or transparent text colour.

## AC4 One connection section with a copy button

Check: list the homepage sections; click "Copy for your agent" and read the clipboard.
True when: the steps, commands, format links and dry run all live in one section (no separate
Report format section), and the clipboard holds Markdown containing every step, each command shown
in the section, both format URLs and the dry-run command, built from the same constants the page
renders.
