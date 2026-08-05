ALTER TABLE agency_mail_items ADD COLUMN provider TEXT;
ALTER TABLE agency_mail_items ADD COLUMN provider_recipient_id TEXT;
ALTER TABLE agency_mail_items ADD COLUMN provider_campaign_id TEXT;
ALTER TABLE agency_mail_items ADD COLUMN provider_order_id TEXT;
ALTER TABLE agency_mail_items ADD COLUMN render_hash TEXT;
ALTER TABLE agency_mail_items ADD COLUMN quoted_cost_pence INTEGER;
ALTER TABLE agency_mail_items ADD COLUMN provider_total_cost_pence INTEGER;
ALTER TABLE agency_mail_items ADD COLUMN provider_currency TEXT;
ALTER TABLE agency_mail_items ADD COLUMN provider_preview_key TEXT;
ALTER TABLE agency_mail_items ADD COLUMN previewed_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN scheduled_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN submission_unknown_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_mail_items_provider_campaign
  ON agency_mail_items(provider_campaign_id)
  WHERE provider_campaign_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_credit_refund_reference
  ON agency_credit_ledger(reason, reference_id)
  WHERE reason = 'mail_refund' AND reference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_credit_reservation_reference
  ON agency_credit_ledger(reason, reference_id)
  WHERE reason = 'mail_reservation' AND reference_id IS NOT NULL;

INSERT INTO app_config (key, value, updated_at)
VALUES (
  'agency_credit_packs',
  '[{"id":"credits-25","name":"Starter","credits":25,"pricePence":3750,"active":true},{"id":"credits-100","name":"Growth","credits":100,"pricePence":15000,"active":true},{"id":"credits-500","name":"Scale","credits":500,"pricePence":75000,"active":true}]',
  datetime('now')
)
ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;
