-- =============================================================================
-- 001_initial_schema.sql
-- Initial schema for Temperies Mundial on Supabase
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username              TEXT        UNIQUE NOT NULL,
  name                  TEXT        NOT NULL,
  password              TEXT        NOT NULL,
  role                  TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_seed           TEXT        NOT NULL,
  legacy_exact_matches  INT         NOT NULL DEFAULT 0,
  legacy_diff_matches   INT         NOT NULL DEFAULT 0,
  legacy_outcome_matches INT        NOT NULL DEFAULT 0
);

CREATE TABLE matches (
  id          TEXT        PRIMARY KEY,  -- "M01", "M02", etc.
  home_team   TEXT        NOT NULL,
  away_team   TEXT        NOT NULL,
  date        TIMESTAMPTZ NOT NULL,
  "group"     TEXT        NOT NULL,
  home_score  INT,
  away_score  INT,
  status      TEXT        NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
  stadium     TEXT        NOT NULL
);

CREATE TABLE predictions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id    TEXT        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score  INT         NOT NULL,
  away_score  INT         NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

-- ---------------------------------------------------------------------------
-- View: users_public (excludes password column)
-- ---------------------------------------------------------------------------

CREATE VIEW users_public AS
  SELECT
    id,
    username,
    name,
    role,
    avatar_seed,
    legacy_exact_matches,
    legacy_diff_matches,
    legacy_outcome_matches
  FROM users;

-- ---------------------------------------------------------------------------
-- RPC: authenticate
-- Accepts the user's UUID (sent as userId from login form) + plain-text password.
-- Returns user row without password. Security definer so anon role can execute.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION authenticate(p_user_id UUID, p_password TEXT)
RETURNS TABLE (
  id                    UUID,
  username              TEXT,
  name                  TEXT,
  role                  TEXT,
  avatar_seed           TEXT,
  legacy_exact_matches  INT,
  legacy_diff_matches   INT,
  legacy_outcome_matches INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      u.id,
      u.username,
      u.name,
      u.role,
      u.avatar_seed,
      u.legacy_exact_matches,
      u.legacy_diff_matches,
      u.legacy_outcome_matches
    FROM users u
    WHERE u.id = p_user_id
      AND u.password = p_password;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions  ENABLE ROW LEVEL SECURITY;

-- Revoke direct anon access to users table (force use of users_public view or authenticate RPC)
REVOKE ALL ON users FROM anon;
GRANT SELECT ON users_public TO anon;
GRANT EXECUTE ON FUNCTION authenticate(UUID, TEXT) TO anon;

-- Matches: anon can read
CREATE POLICY "anon_read_matches"
  ON matches FOR SELECT
  TO anon
  USING (true);

-- Predictions: anon can read all (visibility filtered client-side by match date)
CREATE POLICY "anon_read_predictions"
  ON predictions FOR SELECT
  TO anon
  USING (true);

-- Predictions: anon can insert
CREATE POLICY "anon_insert_predictions"
  ON predictions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Predictions: anon can update (upsert requires UPDATE policy)
CREATE POLICY "anon_update_predictions"
  ON predictions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
