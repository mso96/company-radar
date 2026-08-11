ALTER TABLE agency_radars ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_agency_radars_workspace_archived
  ON agency_radars(workspace_id, archived_at, is_active, created_at DESC);
