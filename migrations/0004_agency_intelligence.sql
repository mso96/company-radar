CREATE TABLE IF NOT EXISTS agency_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agency_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES agency_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_workspace_members (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES agency_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_magic_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES agency_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES agency_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_radars (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  region TEXT,
  keywords_json TEXT NOT NULL DEFAULT '[]',
  company_types_json TEXT NOT NULL DEFAULT '[]',
  event_types_json TEXT NOT NULL DEFAULT '["company.incorporated"]',
  delivery_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (delivery_frequency IN ('daily', 'weekly')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_radar_sic_codes (
  radar_id TEXT NOT NULL,
  sic_code TEXT NOT NULL,
  PRIMARY KEY (radar_id, sic_code),
  FOREIGN KEY (radar_id) REFERENCES agency_radars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_company_watchlist (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  company_number TEXT NOT NULL,
  company_name TEXT,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('competitor', 'client')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, company_number),
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_company_source_snapshots (
  watchlist_id TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (watchlist_id, source_key),
  FOREIGN KEY (watchlist_id) REFERENCES agency_company_watchlist(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  watchlist_id TEXT,
  company_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_at TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_record_json TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (watchlist_id) REFERENCES agency_company_watchlist(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agency_leads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  radar_id TEXT NOT NULL,
  company_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  incorporation_date TEXT NOT NULL,
  location TEXT NOT NULL,
  region TEXT NOT NULL,
  sic_codes_json TEXT NOT NULL,
  match_reasons_json TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (radar_id, company_number),
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (radar_id) REFERENCES agency_radars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_webhook_endpoints (
  id TEXT PRIMARY KEY,
  radar_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (radar_id) REFERENCES agency_radars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_webhook_deliveries (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  delivered_at TEXT,
  last_status INTEGER,
  last_error TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (endpoint_id) REFERENCES agency_webhook_endpoints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agency_exports (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  export_kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES agency_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agency_radars_workspace ON agency_radars(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_watchlist_workspace ON agency_company_watchlist(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agency_events_workspace_event_at ON agency_events(workspace_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_leads_workspace_score ON agency_leads(workspace_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_agency_webhook_deliveries_pending ON agency_webhook_deliveries(delivered_at, next_attempt_at);
