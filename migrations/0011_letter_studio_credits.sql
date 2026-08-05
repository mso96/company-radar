ALTER TABLE agency_letter_templates ADD COLUMN layout_json TEXT;
ALTER TABLE agency_sender_profiles ADD COLUMN primary_color TEXT NOT NULL DEFAULT '#111827';
ALTER TABLE agency_sender_profiles ADD COLUMN text_color TEXT NOT NULL DEFAULT '#111827';
ALTER TABLE agency_sender_profiles ADD COLUMN font_family TEXT NOT NULL DEFAULT 'Arial';
ALTER TABLE agency_sender_profiles ADD COLUMN header_alignment TEXT NOT NULL DEFAULT 'left';

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_welcome_credit_once
  ON agency_credit_ledger(workspace_id, reason)
  WHERE reason = 'welcome_credit';
