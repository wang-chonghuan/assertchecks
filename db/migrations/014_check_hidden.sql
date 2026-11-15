-- Hide a check from the project overview without deleting its data (ASSERT-63).

-- A hidden check keeps all its runs and its detail page; it is only left out of the Tests tab's
-- card grid on the project overview. The switch is reversible with `pnpm admin check:show`.
-- Default false keeps every existing check visible, so applying this migration changes nothing on its own.
ALTER TABLE checks ADD COLUMN hidden boolean NOT NULL DEFAULT false;
