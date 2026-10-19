# ASSERT-19 acceptance checks

## AC1 The theme table is the only source of line heights
Check: `node <ips-design-to-antd-skill>/scripts/check-theme-literals.mjs src/theme.ts ASSERTCHECKS_STYLE`;
`grep -rn "lineHeight: [0-9]" src` outside `src/theme.ts` and `src/generated/`.
True when: the check passes and the grep finds nothing.

## AC2 Every text sits on the scale
Check: production build, ticket-scoped project with one reported run, built-in browser at 1440 and 390
on home, login, project, check and case pages; every visible element with its own text compared with
the scale (14→20, 16→24, 20→28, 26→32, 30→36, 40→48, 76→80, or a single line equal to its size).
True when: no element is off the scale except Clerk's own branding badges.

## AC3 Controls keep their size
Check: heights of selects, buttons, tags, tabs and the header on the check page at 390; `scrollWidth`.
True when: controls stay 32 px, tags 22 px, the header 52 px, and `scrollWidth` equals the viewport.

## AC4 Mechanical checks and record
Check: typecheck, test, build, antd lint; `before/` and `after/` screenshots.
True when: all pass and both sets exist.
