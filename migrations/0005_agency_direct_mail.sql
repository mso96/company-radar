ALTER TABLE agency_radars ADD COLUMN auto_queue_letters INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agency_radars ADD COLUMN mail_template_id TEXT;

CREATE TABLE IF NOT EXISTS agency_sender_profiles (
  workspace_id TEXT PRIMARY KEY,
  agency_name TEXT NOT NULL,
  address_json TEXT NOT NULL DEFAULT '{}',
  reply_email TEXT NOT NULL,
  website TEXT,
  opt_out_text TEXT NOT NULL DEFAULT 'To stop receiving marketing by post, visit our opt-out page with this reference.',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_letter_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  cta_text TEXT,
  cta_url TEXT,
  signature TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_credit_ledger (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  stripe_checkout_session_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_mail_batches (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'sending', 'completed', 'failed', 'cancelled')),
  credit_reserved INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES agency_letter_templates(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS agency_mail_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  lead_id TEXT,
  company_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  address_json TEXT,
  rendered_html TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'blocked', 'pending_approval', 'sending', 'submitted', 'production', 'dispatched', 'failed', 'cancelled', 'suppressed')),
  suppression_reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  stannp_letter_id TEXT UNIQUE,
  provider_cost_pence INTEGER,
  provider_status TEXT,
  provider_pdf_url TEXT,
  last_error TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES agency_mail_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES agency_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agency_suppressions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  company_number TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, company_number),
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agency_mail_items_workspace_status ON agency_mail_items(workspace_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_mail_items_batch_company ON agency_mail_items(batch_id, company_number);
CREATE INDEX IF NOT EXISTS idx_agency_mail_batches_workspace ON agency_mail_batches(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_credits_workspace ON agency_credit_ledger(workspace_id, created_at DESC);
