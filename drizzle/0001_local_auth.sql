CREATE TABLE auth_users (
  id text PRIMARY KEY NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  created_at bigint NOT NULL
);
CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at bigint NOT NULL
);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id);
