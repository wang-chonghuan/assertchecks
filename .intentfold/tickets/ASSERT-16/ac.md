# ASSERT-16 acceptance checks

## AC1 Measured reference and palette
Check: read `palette.md` and `reference/`.
True when: screenshots exist, and every colour has its measured value and its use on adsy.com.

## AC2 One declaration table
Check: `node <ips-design-to-antd-skill>/scripts/check-theme-literals.mjs src/theme.ts ASSERTCHECKS_STYLE`, and read `charter/ui.md`.
True when: the check passes, and ui.md names the table as the only place for custom values.

## AC3 Measured colours match the palette at 1440 and 375
Check: production build, Playwright on home, login, project, check and case pages; computed colours of the primary, default and text buttons, a link, the selected tab, body text, a tag, the page background and a card; `scrollWidth` at 375.
True when: every value equals the confirmed palette, and `scrollWidth` equals the viewport width on every page.

## AC4 Report and checks
Check: the handoff; typecheck, unit tests, build, antd lint.
True when: the handoff lists the palette and roles, contrast (body text ≥ 4.5:1) with adjusted colours, what was not copied and why; all checks pass.
