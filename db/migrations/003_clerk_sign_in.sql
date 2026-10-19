-- Sign-in moved to Clerk email codes (ASSERT-17): users no longer have passwords. password_hash and
-- the sessions table are unused from here on and are dropped in a later migration.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
