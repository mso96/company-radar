CREATE TABLE IF NOT EXISTS alert_runs (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  match_count INTEGER NOT NULL,
  tracked_sic_codes_json TEXT NOT NULL,
  top_cities_json TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES alert_subscriptions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_run_companies (
  alert_run_id TEXT NOT NULL,
  company_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  incorporation_date TEXT NOT NULL,
  location TEXT NOT NULL,
  matched_sic_codes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (alert_run_id, company_number),
  FOREIGN KEY (alert_run_id) REFERENCES alert_runs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_runs_subscription_period
  ON alert_runs(subscription_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_alert_runs_access_token
  ON alert_runs(access_token);

CREATE INDEX IF NOT EXISTS idx_alert_run_companies_alert_run_id
  ON alert_run_companies(alert_run_id);
