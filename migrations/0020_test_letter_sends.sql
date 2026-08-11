ALTER TABLE agency_mail_batches ADD COLUMN batch_kind TEXT NOT NULL DEFAULT 'campaign';
ALTER TABLE agency_mail_items ADD COLUMN manual_recipient_json TEXT;
ALTER TABLE agency_mail_items ADD COLUMN preview_opened_at TEXT;

CREATE INDEX IF NOT EXISTS idx_agency_mail_batches_campaign_kind
  ON agency_mail_batches(workspace_id, radar_id, batch_kind, created_at DESC);
