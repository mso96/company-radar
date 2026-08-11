ALTER TABLE agency_template_library ADD COLUMN layout_json TEXT;
ALTER TABLE agency_letter_templates ADD COLUMN is_campaign_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agency_mail_batches ADD COLUMN radar_id TEXT;
ALTER TABLE agency_mail_items ADD COLUMN qr_target_url TEXT;
ALTER TABLE agency_mail_items ADD COLUMN qr_tracking_token TEXT;
ALTER TABLE agency_mail_items ADD COLUMN qr_first_scanned_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN qr_last_scanned_at TEXT;
ALTER TABLE agency_mail_items ADD COLUMN qr_scan_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agency_radars ADD COLUMN last_scan_started_at TEXT;
ALTER TABLE agency_radars ADD COLUMN last_scan_completed_at TEXT;
ALTER TABLE agency_radars ADD COLUMN last_scan_leads INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agency_radars ADD COLUMN last_scan_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_mail_qr_token ON agency_mail_items(qr_tracking_token) WHERE qr_tracking_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agency_batches_radar ON agency_mail_batches(workspace_id, radar_id, created_at DESC);

UPDATE agency_mail_batches
SET radar_id = (SELECT l.radar_id FROM agency_mail_items i JOIN agency_leads l ON l.id=i.lead_id WHERE i.batch_id=agency_mail_batches.id LIMIT 1)
WHERE radar_id IS NULL;

UPDATE agency_template_library SET layout_json=json_object('version',1,'design',json_object('preset',CASE
  WHEN segment_slug IN ('digital-agencies','it-software') THEN 'modern'
  WHEN segment_slug IN ('legal-services','accounting-bookkeeping') THEN 'professional'
  WHEN segment_slug IN ('marketing-advertising','recruitment-consultancy') THEN 'editorial'
  WHEN segment_slug IN ('construction-services','ecommerce-services') THEN 'bold'
  WHEN segment_slug='property-services' THEN 'premium'
  ELSE 'minimal' END),'blocks',json_array(
    json_object('id','brand','type','brand','align','left'),
    json_object('id','recipient','type','recipient','align','left'),
    json_object('id','heading','type','heading','content',subject,'align','left'),
    json_object('id','message','type','paragraph','content','Hello {{company_name}}, congratulations on your new company. We help businesses like yours put the right support in place early.','align','left'),
    json_object('id','cta','type','cta','content',COALESCE(cta_text,'Learn more'),'url',COALESCE(cta_url,''),'align','left'),
    json_object('id','signature','type','signature','content',signature,'align','left'),
    json_object('id','footer','type','footer','align','left')
  ));
