-- Bind preview acknowledgement to the exact PDF render that the owner opened.
ALTER TABLE agency_mail_items ADD COLUMN preview_opened_render_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_agency_mail_items_preview_render
  ON agency_mail_items(workspace_id, batch_id, preview_opened_render_hash);
