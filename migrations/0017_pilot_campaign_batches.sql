CREATE INDEX IF NOT EXISTS idx_agency_leads_campaign_created
  ON agency_leads(workspace_id, radar_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agency_mail_items_workspace_company_status
  ON agency_mail_items(workspace_id, company_number, status);

CREATE INDEX IF NOT EXISTS idx_agency_mail_items_lead_status
  ON agency_mail_items(lead_id, status)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agency_suppressions_workspace_company
  ON agency_suppressions(workspace_id, company_number);
