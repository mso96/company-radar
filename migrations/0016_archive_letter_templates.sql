ALTER TABLE agency_letter_templates ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_agency_letter_templates_visible ON agency_letter_templates(workspace_id, archived_at, is_campaign_snapshot, created_at DESC);
