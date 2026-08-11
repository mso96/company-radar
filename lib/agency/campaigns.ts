import { listLeads, listRadars } from "@/lib/agency/db"
import { getLetterTemplate, listMailBatches, listMailItems } from "@/lib/agency/mail"
import type { CampaignDetail, CampaignLeadEligibility } from "@/lib/agency/types"

export async function getCampaignDetail(db: D1Database, workspaceId: string, campaignId: string): Promise<CampaignDetail | null> {
  const campaign = (await listRadars(db, workspaceId)).find((item) => item.id === campaignId)
  if (!campaign) return null

  const [allLeads, allBatches, allItems, suppressionRows, stateRows] = await Promise.all([
    listLeads(db, workspaceId),
    listMailBatches(db, workspaceId),
    listMailItems(db, workspaceId),
    db.prepare(`SELECT company_number FROM agency_suppressions WHERE workspace_id=?1`).bind(workspaceId).all<{ company_number: string }>(),
    db.prepare(`SELECT i.company_number,i.status,b.radar_id FROM agency_mail_items i JOIN agency_mail_batches b ON b.id=i.batch_id WHERE i.workspace_id=?1`).bind(workspaceId).all<{ company_number: string; status: string; radar_id: string | null }>(),
  ])
  const batches = allBatches.filter((batch) => batch.radarId === campaignId)
  const batchIds = new Set(batches.map((batch) => batch.id))
  const mailItems = allItems.filter((item) => batchIds.has(item.batchId))
  const campaignBatchIds = new Set(batches.filter((batch) => batch.batchKind !== "test").map((batch) => batch.id))
  const campaignMailItems = mailItems.filter((item) => campaignBatchIds.has(item.batchId))
  const suppressed = new Set((suppressionRows.results ?? []).map((row) => row.company_number))
  const states = stateRows.results ?? []
  const eligibility = (companyNumber: string): CampaignLeadEligibility => {
    if (suppressed.has(companyNumber)) return "suppressed"
    if (states.some((row) => row.company_number === companyNumber && ["submitted", "production", "dispatched"].includes(row.status))) return "sent"
    if (states.some((row) => row.company_number === companyNumber && row.radar_id === campaignId && ["draft", "pending_approval", "sending"].includes(row.status))) return "in_batch"
    return "eligible"
  }
  const leads = allLeads.filter((lead) => lead.radarId === campaignId).map((lead) => ({ ...lead, eligibility: eligibility(lead.company.companyNumber) }))
  const totalQrScans = campaignMailItems.reduce((sum, item) => sum + (item.qrScanCount ?? 0), 0)
  return {
    campaign,
    template: campaign.mailTemplateId ? await getLetterTemplate(db, workspaceId, campaign.mailTemplateId) : null,
    leads,
    batches,
    mailItems,
    analytics: { totalQrScans, companiesScanned: campaignMailItems.filter((item) => (item.qrScanCount ?? 0) > 0).length },
  }
}
