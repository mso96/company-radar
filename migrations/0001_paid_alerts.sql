CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_alert_sent_at TEXT
);

CREATE TABLE IF NOT EXISTS alert_subscription_sic_codes (
  subscription_id TEXT NOT NULL,
  sic_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (subscription_id, sic_code),
  FOREIGN KEY (subscription_id) REFERENCES alert_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_status
  ON alert_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_alert_subscription_sic_codes_sic_code
  ON alert_subscription_sic_codes(sic_code);
