CREATE TABLE IF NOT EXISTS agency_segment_catalog (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  persona TEXT NOT NULL,
  sic_codes_json TEXT NOT NULL,
  default_filters_json TEXT NOT NULL DEFAULT '{}',
  default_template_id TEXT,
  price_pence INTEGER NOT NULL DEFAULT 120,
  currency TEXT NOT NULL DEFAULT 'GBP',
  featured_rank INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agency_template_library (
  id TEXT PRIMARY KEY,
  segment_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  cta_text TEXT,
  cta_url TEXT,
  signature TEXT NOT NULL,
  merge_fields_json TEXT NOT NULL DEFAULT '[]',
  price_pence INTEGER NOT NULL DEFAULT 120,
  currency TEXT NOT NULL DEFAULT 'GBP',
  version TEXT NOT NULL DEFAULT '1',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (segment_slug) REFERENCES agency_segment_catalog(slug) ON DELETE CASCADE
);

ALTER TABLE agency_letter_templates ADD COLUMN source_template_id TEXT;
ALTER TABLE agency_letter_templates ADD COLUMN segment_slug TEXT;
ALTER TABLE agency_letter_templates ADD COLUMN template_version TEXT NOT NULL DEFAULT '1';
ALTER TABLE agency_letter_templates ADD COLUMN is_platform_template INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agency_letter_templates ADD COLUMN pricing_version TEXT NOT NULL DEFAULT '1';

ALTER TABLE agency_radars ADD COLUMN segment_slug TEXT;
ALTER TABLE agency_radars ADD COLUMN company_age_days INTEGER;
ALTER TABLE agency_radars ADD COLUMN company_statuses_json TEXT NOT NULL DEFAULT '["active"]';
ALTER TABLE agency_radars ADD COLUMN postcode_prefixes_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE agency_radars ADD COLUMN daily_send_limit INTEGER NOT NULL DEFAULT 20;
ALTER TABLE agency_radars ADD COLUMN monthly_send_limit INTEGER NOT NULL DEFAULT 400;
ALTER TABLE agency_radars ADD COLUMN approval_required INTEGER NOT NULL DEFAULT 1;
ALTER TABLE agency_radars ADD COLUMN activated_at TEXT;
ALTER TABLE agency_radars ADD COLUMN paused_at TEXT;

ALTER TABLE agency_mail_items ADD COLUMN customer_price_pence INTEGER;
ALTER TABLE agency_mail_items ADD COLUMN currency TEXT NOT NULL DEFAULT 'GBP';
ALTER TABLE agency_mail_items ADD COLUMN margin_pence INTEGER;
ALTER TABLE agency_mail_items ADD COLUMN approved_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN submitted_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN production_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN dispatched_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN failed_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN refunded_at TEXT;

CREATE INDEX IF NOT EXISTS idx_agency_segments_featured ON agency_segment_catalog(is_active, featured_rank);
CREATE INDEX IF NOT EXISTS idx_agency_templates_segment ON agency_template_library(segment_slug, is_active);

INSERT OR IGNORE INTO agency_segment_catalog (slug, name, description, persona, sic_codes_json, default_filters_json, default_template_id, price_pence, currency, featured_rank, is_active, created_at, updated_at) VALUES
  ('digital-agencies', 'Digital agencies', 'Find newly incorporated businesses before their first website or growth brief.', 'Web and digital agencies', '["62012","62020","62090"]', '{"companyAgeDays":30}', 'tpl-digital-agencies', 120, 'GBP', 1, 1, datetime('now'), datetime('now')),
  ('web-design-services', 'Web design services', 'Reach new companies that need a credible first web presence.', 'Web design studios', '["62012","74100"]', '{"companyAgeDays":30}', 'tpl-web-design-services', 120, 'GBP', 2, 1, datetime('now'), datetime('now')),
  ('marketing-advertising', 'Marketing & advertising', 'Spot fresh companies early for brand, content and acquisition support.', 'Marketing agencies', '["73110","73120"]', '{"companyAgeDays":30}', 'tpl-marketing-advertising', 120, 'GBP', 3, 1, datetime('now'), datetime('now')),
  ('it-software', 'IT & software', 'Find new technology companies that need delivery, cloud or product support.', 'IT service providers', '["62012","62020","62090"]', '{"companyAgeDays":30}', 'tpl-it-software', 120, 'GBP', 4, 1, datetime('now'), datetime('now')),
  ('accounting-bookkeeping', 'Accounting & bookkeeping', 'Reach newly formed companies before their first filing deadline.', 'Accountancy firms', '["69201","69202"]', '{"companyAgeDays":30}', 'tpl-accounting-bookkeeping', 120, 'GBP', 5, 1, datetime('now'), datetime('now')),
  ('property-services', 'Property services', 'Find new property businesses for finance, insurance, legal and operations services.', 'Property service providers', '["68310","68320","68100"]', '{"companyAgeDays":30}', 'tpl-property-services', 120, 'GBP', 6, 1, datetime('now'), datetime('now')),
  ('construction-services', 'Construction services', 'Identify new construction companies that need suppliers and professional services.', 'Construction service providers', '["41100","41201","43290"]', '{"companyAgeDays":30}', 'tpl-construction-services', 120, 'GBP', 7, 1, datetime('now'), datetime('now')),
  ('ecommerce-services', 'Ecommerce services', 'Spot new merchants early for store builds, paid media and fulfilment support.', 'Ecommerce agencies', '["47910","47990"]', '{"companyAgeDays":30}', 'tpl-ecommerce-services', 120, 'GBP', 8, 1, datetime('now'), datetime('now')),
  ('legal-services', 'Legal services', 'Find new businesses that need incorporation, contracts and compliance support.', 'Legal service providers', '["69102","69109"]', '{"companyAgeDays":30}', 'tpl-legal-services', 120, 'GBP', 9, 1, datetime('now'), datetime('now')),
  ('recruitment-consultancy', 'Recruitment & business consultancy', 'Reach new employers and founders before their first hiring or growth cycle.', 'Recruitment and consultancy firms', '["78109","70221","70229"]', '{"companyAgeDays":30}', 'tpl-recruitment-consultancy', 120, 'GBP', 10, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO agency_template_library (id, segment_slug, name, description, subject, body_html, cta_text, cta_url, signature, merge_fields_json, price_pence, currency, version, created_at, updated_at)
SELECT 'tpl-' || slug, slug, name || ' introduction', description, 'A quick idea for {{company_name}}', '<p>Hello {{company_name}},</p><p>Congratulations on your new company. We help businesses like yours get the right support in place early.</p><p>{{agency_name}}</p>', 'Book a short introduction', 'https://example.com', 'Your team', '["company_name","company_number","incorporation_date","sic_codes","location","registered_office_address","agency_name","opt_out_reference"]', price_pence, currency, '1', datetime('now'), datetime('now')
FROM agency_segment_catalog;
