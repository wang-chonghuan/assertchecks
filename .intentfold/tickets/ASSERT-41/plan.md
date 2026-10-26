# ASSERT-41 plan

## What the code already says

- `src/components/how-it-works.tsx` draws the boxes as SVG rects stroked with `colorBorderSecondary`
  (1 px), the lightest border token, on `colorBgContainer` inside a white card: nearly invisible.
- The section title comes from `SectionTitle` in `src/routes/index.tsx`; the only other comma title on a
  page is the Alert title in `src/components/production-errors.tsx` when telemetry cannot be read.

## Route

1. Box stroke `colorBorder` (existing token, no theme change); the accent box keeps `colorPrimary`.
2. Homepage section title "How a run reaches your team"; the Alert title "Production telemetry could
   not be read" with the consequence moved into its description.
3. Screenshots at 1440×900 and 390×844.
