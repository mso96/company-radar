import { fetchCompanyPostalAddress } from "@/lib/companies-house"
import { FrankkClient } from "@/lib/agency/frankk"
import { getFrankkState, getMailItemForDispatch, renderLetter, updateFrankkMailItem } from "@/lib/agency/mail"
import { renderA4Pdf, renderHash } from "@/lib/agency/pdf"
import type { AgencyRuntimeEnv } from "@/lib/agency/runtime"
import { requireAgencyEnvValue } from "@/lib/agency/runtime"
import type { SenderProfile } from "@/lib/agency/types"
import type { ManualRecipient } from "@/lib/agency/types"

export async function prepareFrankkCampaign(input: { db: D1Database; env: AgencyRuntimeEnv; client: FrankkClient; workspaceId: string; itemId: string; sender: SenderProfile; storePreview: boolean }) {
  const { db, env, client, workspaceId, itemId, sender } = input
  const row = await getMailItemForDispatch(db, workspaceId, itemId)
  if (!row) throw new Error("Mail item not found.")
  const manualRecipient = parseManualRecipient(row.manual_recipient_json)
  if (!manualRecipient) {
    const suppressed = await db.prepare(`SELECT 1 AS suppressed FROM agency_suppressions WHERE workspace_id=?1 AND company_number=?2`).bind(workspaceId, row.company_number).first()
    if (suppressed) throw new Error(`${row.company_name} is suppressed and cannot be mailed.`)
  }
  const address = manualRecipient?.address ?? await fetchCompanyPostalAddress(requireAgencyEnvValue(env.COMPANIES_HOUSE_API_KEY, "COMPANIES_HOUSE_API_KEY"), row.company_number)
  validateUkAddress(address.postcode, address.country)
  if (!env.BROWSER) throw new Error("Cloudflare Browser Rendering is not configured.")
  const html = renderLetter(row, sender, address)
  const hash = await renderHash(html, JSON.stringify(address))
  const state = await getFrankkState(db, workspaceId, itemId)

  if (state?.provider_campaign_id && state.render_hash === hash) {
    if (input.storePreview && !state.provider_preview_key) return storeCampaignPreview({ db, env, client, workspaceId, itemId, campaignId: state.provider_campaign_id, hash, address, html })
    return { row, address, html, hash, recipientId: state.provider_recipient_id!, campaignId: state.provider_campaign_id, previewKey: state.provider_preview_key }
  }
  if (state?.provider_campaign_id && state.render_hash !== hash) await client.delete(state.provider_campaign_id)

  const pdf = await renderA4Pdf(env.BROWSER, html)
  const recipientId = await client.createRecipient({ companyName: row.company_name, address, workspaceId, mailItemId: itemId, companyNumber: manualRecipient ? "manual_test" : row.company_number, suppressionReference: row.suppression_reference, recipientKind: manualRecipient ? "manual_test" : "company_lead" })
  const campaignId = await client.createCampaign({ name: `CR-${itemId}-${hash}`, recipientId, pdf })
  await updateFrankkMailItem(db, workspaceId, itemId, { status: "pending_approval", address, html, recipientId, campaignId, renderHash: hash, providerStatus: "Preview" })
  if (input.storePreview) return storeCampaignPreview({ db, env, client, workspaceId, itemId, campaignId, hash, address, html, row, recipientId })
  return { row, address, html, hash, recipientId, campaignId, previewKey: undefined }
}

function parseManualRecipient(value: string | null | undefined): ManualRecipient | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as ManualRecipient
    return parsed?.name && parsed.address?.address1 && parsed.address?.postcode ? parsed : null
  } catch { return null }
}

async function storeCampaignPreview(input: { db: D1Database; env: AgencyRuntimeEnv; client: FrankkClient; workspaceId: string; itemId: string; campaignId: string; hash: string; address: Awaited<ReturnType<typeof fetchCompanyPostalAddress>>; html: string; row?: NonNullable<Awaited<ReturnType<typeof getMailItemForDispatch>>>; recipientId?: string }) {
  if (!input.env.AGENCY_ASSETS) throw new Error("Private preview storage is not configured.")
  const pdf = await input.client.preview(input.campaignId)
  const key = `mail-previews/${input.workspaceId}/${input.itemId}/${input.hash}.pdf`
  await input.env.AGENCY_ASSETS.put(key, pdf, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { workspaceId: input.workspaceId, mailItemId: input.itemId, renderHash: input.hash } })
  await updateFrankkMailItem(input.db, input.workspaceId, input.itemId, { status: "pending_approval", previewKey: key, providerStatus: "Preview ready", previewed: true })
  const row = input.row ?? await getMailItemForDispatch(input.db, input.workspaceId, input.itemId)
  return { row: row!, address: input.address, html: input.html, hash: input.hash, recipientId: input.recipientId, campaignId: input.campaignId, previewKey: key }
}

function validateUkAddress(postcode: string, country: string) {
  if (country && !["GB", "UK", "United Kingdom"].includes(country)) throw new Error("Frankk v1 supports United Kingdom addresses only.")
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode.trim())) throw new Error("The registered office has an invalid UK postcode.")
}
