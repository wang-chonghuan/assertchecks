-- ASSERT-50: custom events a project declares as failures, [{event, key, value}]: the event named `event`
-- whose property `key` equals `value`. They become problems like exceptions. Null declares none.
ALTER TABLE error_sources ADD COLUMN failure_events jsonb CHECK (failure_events IS NULL OR jsonb_typeof(failure_events) = 'array');
