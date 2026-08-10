CREATE TABLE IF NOT EXISTS agency_waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'joined', 'archived')),
  source TEXT NOT NULL DEFAULT 'agency_page',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_waitlist_status_created
  ON agency_waitlist(status, created_at DESC);
