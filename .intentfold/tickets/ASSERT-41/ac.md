# ASSERT-41 acceptance checks

1. Homepage at 1440×900 and 390×844: screenshot the How it works diagram; every box edge is visible.
2. The section heading text has no comma (read from the page).
3. `grep` over rendered page titles in `src/routes` and `src/components` finds no heading with a comma;
   the telemetry Alert renders its new title.
