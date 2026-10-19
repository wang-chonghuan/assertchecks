-- Sign-in moved to Clerk in ASSERT-17 (003), which stopped reading and writing both; that code is
-- deployed, so they can go.
DROP TABLE sessions;
ALTER TABLE users DROP COLUMN password_hash;
