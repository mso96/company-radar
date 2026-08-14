import { listLeads, listRadars } from "@/lib/agency/db"
import { getLetterTemplate, listMailBatches, listMailItems } from "@/lib/agency/mail"
import type { CampaignDetail, CampaignLeadEligibility, LetterLayout } from "@/lib/agency/types"

function parseLayout(value: string | null): LetterLayout | null {
  try { return value ? JSON.parse(value) as LetterLayout : null } catch { return null }
}

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
  const template = campaign.mailTemplateId ? await getLetterTemplate(db, workspaceId, campaign.mailTemplateId) : null
  const templateMeta = template ? await db.prepare(`SELECT created_at,source_template_id,layout_json FROM agency_letter_templates WHERE id=?1 AND workspace_id=?2`).bind(template.id, workspaceId).first<{ created_at: string; source_template_id: string | null; layout_json: string | null }>() : null
  const sourceMeta = templateMeta?.source_template_id ? await db.prepare(`SELECT updated_at FROM agency_letter_templates WHERE id=?1 AND workspace_id=?2 AND archived_at IS NULL`).bind(templateMeta.source_template_id, workspaceId).first<{ updated_at: string }>() : null
  const qrEnabled = Boolean(parseLayout(templateMeta?.layout_json ?? null)?.blocks.some((block) => block.type === "qr" && block.url))
  return {
    campaign,
    template,
    leads,
    batches,
    mailItems,
    analytics: { totalQrScans, companiesScanned: campaignMailItems.filter((item) => (item.qrScanCount ?? 0) > 0).length, qrEnabled },
    templateStatus: { snapshotCreatedAt: templateMeta?.created_at ?? null, sourceUpdatedAt: sourceMeta?.updated_at ?? null, newerVersionAvailable: Boolean(sourceMeta?.updated_at && templateMeta?.created_at && new Date(sourceMeta.updated_at) > new Date(templateMeta.created_at)) },
  }
}
