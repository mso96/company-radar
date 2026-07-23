ALTER TABLE agency_users ADD COLUMN clerk_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_users_clerk_user_id
  ON agency_users(clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;
