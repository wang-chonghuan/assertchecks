-- ASSERT-31: a case's run policy is `regular` (part of every full run) or `on-demand` (only when named),
-- replacing `nightly` and `manual`, which read like a schedule. Checks' selections and the catalogs
-- stored with past runs move to the new values, so old runs keep showing their cases correctly and no
-- code has to accept both names. Run triggers (`schedule`, `manual`) are unchanged.
ALTER TABLE checks ALTER COLUMN selection SET DEFAULT '{"status": ["active"], "run": ["regular"]}'::jsonb;

UPDATE checks
SET selection = jsonb_set(selection, '{run}', (
  SELECT COALESCE(jsonb_agg(CASE value WHEN 'nightly' THEN 'regular' WHEN 'manual' THEN 'on-demand' ELSE value END ORDER BY ordinality), '[]'::jsonb)
  FROM jsonb_array_elements_text(selection->'run') WITH ORDINALITY))
WHERE jsonb_typeof(selection->'run') = 'array';

UPDATE runs
SET catalog = jsonb_set(catalog, '{cases}', (
  SELECT jsonb_agg(CASE c->>'run'
    WHEN 'nightly' THEN jsonb_set(c, '{run}', '"regular"')
    WHEN 'manual' THEN jsonb_set(c, '{run}', '"on-demand"')
    ELSE c END ORDER BY i)
  FROM jsonb_array_elements(catalog->'cases') WITH ORDINALITY AS x(c, i)))
WHERE jsonb_typeof(catalog->'cases') = 'array'
  AND jsonb_array_length(catalog->'cases') > 0
  AND catalog->'cases' @? '$[*] ? (@.run == "nightly" || @.run == "manual")';
