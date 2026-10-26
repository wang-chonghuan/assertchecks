# ASSERT-41 handoff

## What changed

- `src/components/how-it-works.tsx`: diagram boxes are stroked with `colorBorder` instead of the
  lightest `colorBorderSecondary`; the AssertChecks box keeps its primary outline. No theme change.
- `src/routes/index.tsx`: section title "How a run reaches your team" (was "One run, from your CI to
  your team").
- `src/components/production-errors.tsx`: Alert title "Production telemetry could not be read"; "The
  errors below are unknown until it can." moved into its description.

## AC results

1. Pass. Homepage at 1440×900 and 390×844 on port 63041: every box edge in the How it works diagram is
   visible.
2. Pass. The section heading reads "How a run reaches your team".
3. Pass. No title, `title=` prop or Title element with a comma remains in `src/routes`,
   `src/components` or `src/lib`.

Mechanical defence: typecheck, tests, build — pass.

## Deviations

None.

## Environment

Port 63041. No env keys, no migration.

## Residual

None.

## Check

1. http://localhost:63041/#how-it-works — the diagram's borders and the new section title, desktop and
   phone.

## Decided for you

- Border colour is the existing `colorBorder` token; `theme.ts` untouched.
- New title "How a run reaches your team"; the telemetry warning's consequence moved to its body text.
