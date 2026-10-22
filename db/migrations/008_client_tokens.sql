-- ASSERT-38: the client signed in as a person. The client makes its token and sends only the hash; the
-- person approves the short code in the browser, which binds the token to them. A row without a user is
-- a sign-in still waiting for approval and is void after 10 minutes.
CREATE TABLE client_tokens (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash  text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  code        text NOT NULL UNIQUE,
  user_id     bigint REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CHECK ((user_id IS NULL) = (approved_at IS NULL))
);
