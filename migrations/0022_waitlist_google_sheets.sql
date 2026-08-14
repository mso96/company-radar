ALTER TABLE agency_waitlist ADD COLUMN sheet_synced_at TEXT;
ALTER TABLE agency_waitlist ADD COLUMN sheet_sync_error TEXT;

CREATE INDEX IF NOT EXISTS idx_agency_waitlist_sheet_sync
  ON agency_waitlist(sheet_synced_at, created_at);
