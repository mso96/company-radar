import type { AgencyLead, CreditMovement, CreditPack, LetterLayout, LetterTemplate, MailBatch, MailItem, ManualRecipient, PostalAddress, SenderProfile } from "@/lib/agency/types"
import { FrankkClient } from "@/lib/agency/frankk"
import { normalizeAccentColor, normalizeExternalUrl } from "@/lib/agency/branding"
import { normalizeLetterLayout } from "@/lib/agency/letter-layout"
import { qrSvgDataUrl } from "@/lib/agency/qr"

const now = () => new Date().toISOString()
const json = <T>(value: string | null | undefined, fallback: T) => { try { return value ? JSON.parse(value) as T : fallback } catch { return fallback } }

export async function getCreditBalance(db: D1Database, workspaceId: string) {
  const row = await db.prepare(`SELECT COALESCE(SUM(delta), 0) AS balance FROM agency_credit_ledger WHERE workspace_id = ?1`).bind(workspaceId).first<{ balance: number }>()
  return Number(row?.balance ?? 0)
}

export async function getCreditPacks(db: D1Database): Promise<CreditPack[]> {
  const row = await db.prepare(`SELECT value FROM app_config WHERE key = 'agency_credit_packs'`).first<{ value: string }>()
  const packs = json<CreditPack[]>(row?.value, [
    { id: "credits-25", name: "Starter", credits: 25, pricePence: 3750, active: true },
    { id: "credits-100", name: "Growth", credits: 100, pricePence: 15000, active: true },
    { id: "credits-500", name: "Scale", credits: 500, pricePence: 75000, active: true },
  ])
  return packs.filter((pack) => pack.active && pack.id && pack.credits > 0 && pack.pricePence > 0)
}

export async function ensureWelcomeCredit(db: D1Database, workspaceId: string) {
  await db.prepare(`INSERT INTO agency_credit_ledger (id, workspace_id, delta, reason, reference_id, created_at) VALUES (?1, ?2, 1, 'welcome_credit', ?2, ?3) ON CONFLICT DO NOTHING`).bind(crypto.randomUUID(), workspaceId, now()).run()
}

export async function listCreditMovements(db: D1Database, workspaceId: string): Promise<CreditMovement[]> {
  const rows = await db.prepare(`SELECT id, delta, reason, created_at FROM agency_credit_ledger WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 20`).bind(workspaceId).all<{ id: string; delta: number; reason: string; created_at: string }>()
  return (rows.results ?? []).map((row) => ({ id: row.id, delta: row.delta, reason: row.reason, createdAt: row.created_at }))
}

export async function getSenderProfile(db: D1Database, workspaceId: string): Promise<SenderProfile | null> {
  const row = await db.prepare(`SELECT agency_name, address_json, reply_email, website, opt_out_text, logo_url, accent_color, primary_color, text_color, font_family, header_alignment FROM agency_sender_profiles WHERE workspace_id = ?1`).bind(workspaceId).first<{ agency_name: string; address_json: string; reply_email: string; website: string | null; opt_out_text: string; logo_url: string | null; accent_color: string | null; primary_color: string | null; text_color: string | null; font_family: string | null; header_alignment: "left" | "center" | "right" | null }>()
  return row ? { agencyName: row.agency_name, address: json<PostalAddress>(row.address_json, emptyAddress()), replyEmail: row.reply_email, website: normalizeExternalUrl(row.website), optOutText: row.opt_out_text, logoUrl: normalizeExternalUrl(row.logo_url), accentColor: normalizeAccentColor(row.accent_color), primaryColor: normalizeAccentColor(row.primary_color ?? "#111827"), textColor: normalizeAccentColor(row.text_color ?? "#111827"), fontFamily: normalizeFont(row.font_family), headerAlignment: row.header_alignment ?? "left" } : null
}

export function senderReadiness(sender: SenderProfile | null) {
  const missing: string[] = []
  if (!sender?.agencyName.trim()) missing.push("business name")
  if (!sender?.replyEmail.trim()) missing.push("reply email")
  if (!sender?.address.address1.trim() || !sender.address.town.trim() || !sender.address.postcode.trim()) missing.push("UK postal address")
  if (!sender?.website?.trim()) missing.push("website / CTA address")
  if (!sender?.optOutText.trim()) missing.push("opt-out text")
  return { ready: missing.length === 0, missing }
}

export async function saveSenderProfile(db: D1Database, workspaceId: string, input: SenderProfile) {
  if (!input.agencyName.trim() || !input.replyEmail.trim() || !input.address.address1.trim() || !input.address.town.trim() || !input.address.postcode.trim()) throw new Error("Complete your sender name, reply email and postal address.")
  const accentColor = normalizeAccentColor(input.accentColor)
  const logoUrl = normalizeExternalUrl(input.logoUrl)
  const website = normalizeExternalUrl(input.website)
  await db.prepare(`INSERT INTO agency_sender_profiles (workspace_id, agency_name, address_json, reply_email, website, opt_out_text, logo_url, accent_color, primary_color, text_color, font_family, header_alignment, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13) ON CONFLICT(workspace_id) DO UPDATE SET agency_name=excluded.agency_name,address_json=excluded.address_json,reply_email=excluded.reply_email,website=excluded.website,opt_out_text=excluded.opt_out_text,logo_url=excluded.logo_url,accent_color=excluded.accent_color,primary_color=excluded.primary_color,text_color=excluded.text_color,font_family=excluded.font_family,header_alignment=excluded.header_alignment,updated_at=excluded.updated_at`).bind(workspaceId, input.agencyName.trim(), JSON.stringify(input.address), input.replyEmail.trim(), website, input.optOutText.trim() || "To stop receiving marketing by post, use this reference.", logoUrl, accentColor, normalizeAccentColor(input.primaryColor ?? "#111827"), normalizeAccentColor(input.textColor ?? "#111827"), normalizeFont(input.fontFamily), normalizeAlignment(input.headerAlignment), now()).run()
}

export async function listLetterTemplates(db: D1Database, workspaceId: string): Promise<LetterTemplate[]> {
  const rows = await db.prepare(`SELECT t.*, l.price_pence, l.currency FROM agency_letter_templates t LEFT JOIN agency_template_library l ON l.id = t.source_template_id WHERE t.workspace_id = ?1 AND t.archived_at IS NULL AND COALESCE(t.is_campaign_snapshot,0)=0 ORDER BY t.is_default DESC, t.created_at DESC`).bind(workspaceId).all<TemplateRow>()
  return (rows.results ?? []).map(mapTemplate)
}

export async function getLetterTemplate(db: D1Database, workspaceId: string, templateId: string): Promise<LetterTemplate | null> {
  const row = await db.prepare(`SELECT t.*, l.price_pence, l.currency FROM agency_letter_templates t LEFT JOIN agency_template_library l ON l.id=t.source_template_id WHERE t.id=?1 AND t.workspace_id=?2`).bind(templateId, workspaceId).first<TemplateRow>()
  return row ? mapTemplate(row) : null
}

export async function archiveLetterTemplate(db: D1Database, workspaceId: string, templateId: string) {
  const result = await db.prepare(`UPDATE agency_letter_templates SET archived_at=?1,updated_at=?1,is_default=0 WHERE id=?2 AND workspace_id=?3 AND archived_at IS NULL AND COALESCE(is_campaign_snapshot,0)=0 AND COALESCE(is_platform_template,0)=0`).bind(now(), templateId, workspaceId).run() as { meta?: { changes?: number }; changes?: number }
  if (Number(result.meta?.changes ?? result.changes ?? 0) !== 1) throw new Error("This template could not be removed.")
}

export async function createCampaignTemplateSnapshot(db: D1Database, workspaceId: string, templateId: string, campaignName: string) {
  const source = await db.prepare(`SELECT * FROM agency_letter_templates WHERE id=?1 AND workspace_id=?2 AND COALESCE(is_campaign_snapshot,0)=0`).bind(templateId, workspaceId).first<TemplateRow>()
  if (!source) throw new Error("Choose a saved letter template from this workspace.")
  const id = crypto.randomUUID(); const timestamp = now()
  await db.prepare(`INSERT INTO agency_letter_templates (id,workspace_id,name,subject,body_html,cta_text,cta_url,signature,is_default,created_at,updated_at,source_template_id,segment_slug,template_version,is_platform_template,pricing_version,service_focus_json,layout_json,is_campaign_snapshot) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,?9,?9,?10,?11,?12,0,?13,?14,?15,1)`).bind(id, workspaceId, `${campaignName.trim() || "Campaign"} · snapshot`, source.subject, source.body_html, source.cta_text, source.cta_url, source.signature, timestamp, source.id, source.segment_slug, source.template_version, source.pricing_version, source.service_focus_json ?? "[]", source.layout_json).run()
  return id
}

export async function saveLetterTemplate(db: D1Database, workspaceId: string, input: Omit<LetterTemplate, "id" | "workspaceId" | "createdAt"> & { id?: string }) {
  if (!input.name.trim() || !input.subject.trim() || !input.bodyHtml.trim() || !input.signature.trim()) throw new Error("Template name, subject, message and signature are required.")
  const id = input.id ?? crypto.randomUUID(); const timestamp = now()
  if (input.isDefault) await db.prepare(`UPDATE agency_letter_templates SET is_default = 0 WHERE workspace_id = ?1`).bind(workspaceId).run()
  const services = Array.from(new Set((input.serviceFocus ?? []).map((service) => service.trim()).filter(Boolean)))
  const layout = normalizeLetterLayout(input.layout, input)
  await db.prepare(`INSERT INTO agency_letter_templates (id, workspace_id, name, subject, body_html, cta_text, cta_url, signature, is_default, created_at, updated_at, service_focus_json, layout_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?11, ?12) ON CONFLICT(id) DO UPDATE SET name=excluded.name,subject=excluded.subject,body_html=excluded.body_html,cta_text=excluded.cta_text,cta_url=excluded.cta_url,signature=excluded.signature,is_default=excluded.is_default,service_focus_json=excluded.service_focus_json,layout_json=excluded.layout_json,updated_at=excluded.updated_at`).bind(id, workspaceId, input.name.trim(), input.subject.trim(), input.bodyHtml.trim(), input.ctaText?.trim() || null, input.ctaUrl?.trim() || null, input.signature.trim(), input.isDefault ? 1 : 0, timestamp, JSON.stringify(services), JSON.stringify(layout)).run()
  return id
}

export async function listMailBatches(db: D1Database, workspaceId: string): Promise<MailBatch[]> {
  const rows = await db.prepare(`SELECT id, name, template_id, radar_id, batch_kind, status, credit_reserved, created_at FROM agency_mail_batches WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 100`).bind(workspaceId).all<BatchRow>()
  return (rows.results ?? []).map((row) => ({ id: row.id, name: row.name, templateId: row.template_id, radarId: row.radar_id, batchKind: row.batch_kind === "test" ? "test" : "campaign", status: row.status, creditReserved: row.credit_reserved, createdAt: row.created_at }))
}

export async function listMailItems(db: D1Database, workspaceId: string): Promise<MailItem[]> {
  const rows = await db.prepare(`SELECT id, batch_id, company_number, company_name, status, provider_status, scheduled_at, submission_unknown_at, preview_opened_at, last_error, created_at, qr_scan_count, qr_first_scanned_at, qr_last_scanned_at, manual_recipient_json FROM agency_mail_items WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 200`).bind(workspaceId).all<ItemRow>()
  return (rows.results ?? []).map((row) => ({ id: row.id, batchId: row.batch_id, companyNumber: row.company_number, companyName: row.company_name, status: row.status, providerStatus: publicDeliveryStatus(row.status, row.provider_status), scheduledAt: row.scheduled_at, submissionUnknownAt: row.submission_unknown_at, previewOpenedAt: row.preview_opened_at, lastError: publicDeliveryError(row.last_error), createdAt: row.created_at, qrScanCount: row.qr_scan_count ?? 0, qrFirstScannedAt: row.qr_first_scanned_at, qrLastScannedAt: row.qr_last_scanned_at, manualRecipient: json<ManualRecipient | null>(row.manual_recipient_json, null) }))
}

export async function createMailBatchFromLeads(db: D1Database, input: { workspaceId: string; userId: string; templateId: string; leadIds: string[]; name?: string; radarId?: string }) {
  const template = await db.prepare(`SELECT id FROM agency_letter_templates WHERE id = ?1 AND workspace_id = ?2`).bind(input.templateId, input.workspaceId).first()
  if (!template) throw new Error("Choose a letter template from this workspace.")
  const ids = Array.from(new Set(input.leadIds.filter(Boolean)))
  if (!ids.length) throw new Error("Select at least one lead.")
  if (ids.length > 20) throw new Error("A pilot batch can contain at most 20 letters.")
  const placeholders = ids.map(() => "?").join(",")
  const leads = await db.prepare(`SELECT id, radar_id, company_number, company_name FROM agency_leads WHERE workspace_id = ? AND id IN (${placeholders})`).bind(input.workspaceId, ...ids).all<{ id: string; radar_id: string; company_number: string; company_name: string }>()
  if (!(leads.results ?? []).length) throw new Error("Selected leads are no longer available.")
  const id = crypto.randomUUID(); const timestamp = now()
  const radarId = input.radarId ?? leads.results?.[0]?.radar_id
  if (!radarId || (leads.results ?? []).some((lead) => lead.radar_id !== radarId)) throw new Error("Create a batch from one campaign at a time.")
  const companyNumbers = (leads.results ?? []).map((lead) => lead.company_number)
  const companyPlaceholders = companyNumbers.map(() => "?").join(",")
  const blocked = await db.prepare(`SELECT company_number, reason FROM (
    SELECT company_number, 'suppressed' AS reason FROM agency_suppressions WHERE workspace_id=? AND company_number IN (${companyPlaceholders})
    UNION ALL
    SELECT company_number, 'already sent' AS reason FROM agency_mail_items WHERE workspace_id=? AND company_number IN (${companyPlaceholders}) AND status IN ('submitted','production','dispatched')
    UNION ALL
    SELECT i.company_number, 'already in a batch' AS reason FROM agency_mail_items i JOIN agency_mail_batches b ON b.id=i.batch_id WHERE i.workspace_id=? AND b.radar_id=? AND i.company_number IN (${companyPlaceholders}) AND i.status IN ('draft','pending_approval','sending')
  ) LIMIT 1`).bind(
    input.workspaceId, ...companyNumbers,
    input.workspaceId, ...companyNumbers,
    input.workspaceId, radarId, ...companyNumbers,
  ).first<{ company_number: string; reason: string }>()
  if (blocked) throw new Error(`${blocked.company_number} is ${blocked.reason} and cannot be added.`)
  const target = qrTarget(json<LetterLayout | null>((await db.prepare(`SELECT layout_json FROM agency_letter_templates WHERE id=?1`).bind(input.templateId).first<{layout_json:string|null}>())?.layout_json, null))
  const statements = [db.prepare(`INSERT INTO agency_mail_batches (id, workspace_id, template_id, radar_id, name, status, created_by_user_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 'pending_approval', ?6, ?7, ?7)`).bind(id, input.workspaceId, input.templateId, radarId, input.name?.trim() || `New company outreach — ${new Date().toLocaleDateString("en-GB")}`, input.userId, timestamp)]
  for (const lead of leads.results ?? []) statements.push(db.prepare(`INSERT INTO agency_mail_items (id, workspace_id, batch_id, lead_id, company_number, company_name, status, suppression_reference, idempotency_key, qr_target_url, qr_tracking_token, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending_approval', ?7, ?8, ?9, ?10, ?11, ?11) ON CONFLICT(batch_id, company_number) DO NOTHING`).bind(crypto.randomUUID(), input.workspaceId, id, lead.id, lead.company_number, lead.company_name, shortRef(), crypto.randomUUID(), target, target ? secureToken() : null, timestamp))
  await db.batch(statements)
  return id
}

export async function createTestMailBatch(db: D1Database, input: { workspaceId: string; userId: string; campaignId: string; templateId: string; recipient: ManualRecipient }) {
  const recipient = normalizeManualRecipient(input.recipient)
  const campaign = await db.prepare(`SELECT id FROM agency_radars WHERE id=?1 AND workspace_id=?2 AND mail_template_id=?3 AND archived_at IS NULL`).bind(input.campaignId, input.workspaceId, input.templateId).first()
  if (!campaign) throw new Error("This campaign letter is no longer available.")
  const template = await db.prepare(`SELECT id,layout_json FROM agency_letter_templates WHERE id=?1 AND workspace_id=?2 AND COALESCE(is_campaign_snapshot,0)=1`).bind(input.templateId, input.workspaceId).first<{ id: string; layout_json: string | null }>()
  if (!template) throw new Error("This campaign does not have a saved letter snapshot.")
  const batchId = crypto.randomUUID(); const itemId = crypto.randomUUID(); const timestamp = now()
  const target = qrTarget(json<LetterLayout | null>(template.layout_json, null))
  await db.batch([
    db.prepare(`INSERT INTO agency_mail_batches (id,workspace_id,template_id,radar_id,batch_kind,name,status,created_by_user_id,created_at,updated_at) VALUES (?1,?2,?3,?4,'test',?5,'pending_approval',?6,?7,?7)`).bind(batchId, input.workspaceId, input.templateId, input.campaignId, `Test letter · ${recipient.name}`, input.userId, timestamp),
    db.prepare(`INSERT INTO agency_mail_items (id,workspace_id,batch_id,lead_id,company_number,company_name,manual_recipient_json,address_json,status,suppression_reference,idempotency_key,qr_target_url,qr_tracking_token,created_at,updated_at) VALUES (?1,?2,?3,NULL,?4,?5,?6,?7,'pending_approval',?8,?9,?10,?11,?12,?12)`).bind(itemId, input.workspaceId, batchId, `MANUAL-TEST-${itemId.slice(0, 12).toUpperCase()}`, recipient.name, JSON.stringify(recipient), JSON.stringify(recipient.address), shortRef(), crypto.randomUUID(), target, target ? secureToken() : null, timestamp),
  ])
  return { batchId, itemId, recipient }
}

export async function autoQueueLead(db: D1Database, input: { workspaceId: string; radarId: string; leadId: string; companyNumber: string; companyName: string }) {
  const radar = await db.prepare(`SELECT mail_template_id FROM agency_radars WHERE id = ?1 AND workspace_id = ?2 AND auto_queue_letters = 1`).bind(input.radarId, input.workspaceId).first<{ mail_template_id: string | null }>()
  if (!radar?.mail_template_id) return
  const template = await db.prepare(`SELECT id FROM agency_letter_templates WHERE id = ?1 AND workspace_id = ?2`).bind(radar.mail_template_id, input.workspaceId).first()
  if (!template) return
  await createMailBatchFromLeads(db, { workspaceId: input.workspaceId, userId: "system", templateId: radar.mail_template_id, leadIds: [input.leadId], name: `Radar ${input.radarId} — automatic queue` })
}

export async function getMailItemForDispatch(db: D1Database, workspaceId: string, itemId: string) {
  return db.prepare(`SELECT i.*, b.template_id, t.subject, t.body_html, t.cta_text, t.cta_url, t.signature, t.layout_json, t.service_focus_json, l.incorporation_date, l.sic_codes_json, l.location, r.service_focus_json AS radar_service_focus_json FROM agency_mail_items i JOIN agency_mail_batches b ON b.id = i.batch_id JOIN agency_letter_templates t ON t.id = b.template_id LEFT JOIN agency_leads l ON l.id = i.lead_id LEFT JOIN agency_radars r ON r.id = l.radar_id WHERE i.id = ?1 AND i.workspace_id = ?2`).bind(itemId, workspaceId).first<DispatchRow>()
}

export async function listPendingMailItems(db: D1Database, workspaceId: string, batchId: string) { const rows = await db.prepare(`SELECT id, previewed_at, preview_opened_at FROM agency_mail_items WHERE workspace_id = ?1 AND batch_id = ?2 AND status = 'pending_approval' ORDER BY created_at ASC`).bind(workspaceId, batchId).all<{ id: string; previewed_at: string | null; preview_opened_at: string | null }>(); return rows.results ?? [] }
export async function reserveCredits(db: D1Database, workspaceId: string, batchId: string, count: number) { const timestamp = now(); const reservationId = crypto.randomUUID(); const result = await db.prepare(`INSERT INTO agency_credit_ledger (id, workspace_id, delta, reason, reference_id, created_at) SELECT ?1, ?2, ?3, 'mail_reservation', ?4, ?5 WHERE EXISTS (SELECT 1 FROM agency_mail_batches WHERE id=?4 AND workspace_id=?2 AND status='pending_approval') AND (SELECT COALESCE(SUM(delta),0) FROM agency_credit_ledger WHERE workspace_id=?2) >= ?6 ON CONFLICT DO NOTHING`).bind(reservationId, workspaceId, -count, batchId, timestamp, count).run() as { meta?: { changes?: number }; changes?: number }; if (Number(result.meta?.changes ?? result.changes ?? 0) !== 1) { const balance = await getCreditBalance(db, workspaceId); if (balance < count) throw new Error(`Insufficient credits. You need ${count} credits and have ${balance}.`); throw new Error("This batch is already being approved or has already been processed.") } await db.prepare(`UPDATE agency_mail_batches SET status='approved', credit_reserved=?1, approved_at=?2, updated_at=?2 WHERE id=?3 AND workspace_id=?4 AND status='pending_approval'`).bind(count, timestamp, batchId, workspaceId).run() }
export async function refundCredit(db: D1Database, workspaceId: string, itemId: string) { await db.prepare(`INSERT INTO agency_credit_ledger (id, workspace_id, delta, reason, reference_id, created_at) SELECT ?1, ?2, 1, 'mail_refund', ?3, ?4 WHERE EXISTS (SELECT 1 FROM agency_mail_items WHERE id=?3 AND workspace_id=?2) ON CONFLICT DO NOTHING`).bind(crypto.randomUUID(), workspaceId, itemId, now()).run() }
export async function addCredits(db: D1Database, input: { workspaceId: string; credits: number; checkoutSessionId: string }) { await db.prepare(`INSERT INTO agency_credit_ledger (id, workspace_id, delta, reason, stripe_checkout_session_id, created_at) VALUES (?1, ?2, ?3, 'credit_purchase', ?4, ?5) ON CONFLICT(stripe_checkout_session_id) DO NOTHING`).bind(crypto.randomUUID(), input.workspaceId, input.credits, input.checkoutSessionId, now()).run() }
export async function updateMailItem(db: D1Database, itemId: string, changes: { status: string; address?: PostalAddress; html?: string; stannpId?: string; costPence?: number; providerStatus?: string; pdfUrl?: string; error?: string }) { await db.prepare(`UPDATE agency_mail_items SET status=?1,address_json=COALESCE(?2,address_json),rendered_html=COALESCE(?3,rendered_html),stannp_letter_id=COALESCE(?4,stannp_letter_id),provider_cost_pence=COALESCE(?5,provider_cost_pence),provider_status=COALESCE(?6,provider_status),provider_pdf_url=COALESCE(?7,provider_pdf_url),last_error=?8,last_synced_at=?9,updated_at=?9 WHERE id=?10`).bind(changes.status, changes.address ? JSON.stringify(changes.address) : null, changes.html ?? null, changes.stannpId ?? null, changes.costPence ?? null, changes.providerStatus ?? null, changes.pdfUrl ?? null, changes.error ?? null, now(), itemId).run() }
export async function updateFrankkMailItem(db: D1Database, workspaceId: string, itemId: string, changes: { status: string; address?: PostalAddress; html?: string; recipientId?: string; campaignId?: string; orderId?: string; renderHash?: string; quotedCostPence?: number; totalCostPence?: number; currency?: string; previewKey?: string; providerStatus?: string; error?: string; previewed?: boolean; scheduled?: boolean; submissionUnknown?: boolean }) {
  const timestamp = now()
  await db.prepare(`UPDATE agency_mail_items SET status=?1,provider='frankk',address_json=COALESCE(?2,address_json),rendered_html=COALESCE(?3,rendered_html),provider_recipient_id=COALESCE(?4,provider_recipient_id),provider_campaign_id=COALESCE(?5,provider_campaign_id),provider_order_id=COALESCE(?6,provider_order_id),render_hash=COALESCE(?7,render_hash),quoted_cost_pence=COALESCE(?8,quoted_cost_pence),provider_total_cost_pence=COALESCE(?9,provider_total_cost_pence),provider_currency=COALESCE(?10,provider_currency),provider_preview_key=COALESCE(?11,provider_preview_key),provider_status=COALESCE(?12,provider_status),last_error=?13,previewed_at=CASE WHEN ?14=1 THEN ?15 ELSE previewed_at END,scheduled_at=CASE WHEN ?16=1 THEN ?15 ELSE scheduled_at END,submission_unknown_at=CASE WHEN ?17=1 THEN ?15 ELSE submission_unknown_at END,last_synced_at=?15,updated_at=?15 WHERE id=?18 AND workspace_id=?19`).bind(changes.status, changes.address ? JSON.stringify(changes.address) : null, changes.html ?? null, changes.recipientId ?? null, changes.campaignId ?? null, changes.orderId ?? null, changes.renderHash ?? null, changes.quotedCostPence ?? null, changes.totalCostPence ?? null, changes.currency ?? null, changes.previewKey ?? null, changes.providerStatus ?? null, changes.error ?? null, changes.previewed ? 1 : 0, timestamp, changes.scheduled ? 1 : 0, changes.submissionUnknown ? 1 : 0, itemId, workspaceId).run()
  if (["submitted", "production", "dispatched", "failed"].includes(changes.status)) await db.prepare(`UPDATE agency_mail_items SET submitted_at=CASE WHEN ?1='submitted' THEN COALESCE(submitted_at,?2) ELSE submitted_at END,production_at=CASE WHEN ?1='production' THEN COALESCE(production_at,?2) ELSE production_at END,dispatched_at=CASE WHEN ?1='dispatched' THEN COALESCE(dispatched_at,?2) ELSE dispatched_at END,failed_at=CASE WHEN ?1='failed' THEN COALESCE(failed_at,?2) ELSE failed_at END WHERE id=?3 AND workspace_id=?4`).bind(changes.status, timestamp, itemId, workspaceId).run()
}
export async function getFrankkState(db: D1Database, workspaceId: string, itemId: string) { return db.prepare(`SELECT provider_recipient_id,provider_campaign_id,render_hash,provider_preview_key,status FROM agency_mail_items WHERE id=?1 AND workspace_id=?2`).bind(itemId, workspaceId).first<{ provider_recipient_id: string | null; provider_campaign_id: string | null; render_hash: string | null; provider_preview_key: string | null; status: string }>() }
export async function completeMailBatch(db: D1Database, workspaceId: string, batchId: string, status: "completed" | "failed") { await db.prepare(`UPDATE agency_mail_batches SET status = ?1, updated_at = ?2 WHERE id = ?3 AND workspace_id = ?4`).bind(status, now(), batchId, workspaceId).run() }
export async function suppressCompany(db: D1Database, workspaceId: string, companyNumber: string, reason?: string) { const timestamp = now(); await db.batch([db.prepare(`INSERT INTO agency_suppressions (id, workspace_id, company_number, reason, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(workspace_id, company_number) DO NOTHING`).bind(crypto.randomUUID(), workspaceId, companyNumber, reason ?? null, timestamp), db.prepare(`UPDATE agency_mail_items SET status='suppressed',updated_at=?1 WHERE workspace_id=?2 AND company_number=?3 AND status IN ('draft','pending_approval','approved')`).bind(timestamp, workspaceId, companyNumber)]) }
export async function getMailItemByReference(db: D1Database, reference: string) { return db.prepare(`SELECT id, workspace_id, company_number FROM agency_mail_items WHERE suppression_reference = ?1`).bind(reference).first<{ id: string; workspace_id: string; company_number: string }>() }
export async function syncFrankkMailStatuses(db: D1Database, apiKey: string) { const rows = await db.prepare(`SELECT id, workspace_id, provider_campaign_id FROM agency_mail_items WHERE provider='frankk' AND provider_campaign_id IS NOT NULL AND status IN ('submitted','production') ORDER BY updated_at ASC LIMIT 100`).all<{ id: string; workspace_id: string; provider_campaign_id: string }>(); const provider = new FrankkClient(apiKey); let synced = 0; for (const item of rows.results ?? []) { try { const result = await provider.status(item.provider_campaign_id); const status = normalizeProviderStatus(result.status); await updateFrankkMailItem(db, item.workspace_id, item.id, { status, providerStatus: result.status }); if (result.dispatchedAt) await db.prepare(`UPDATE agency_mail_items SET dispatched_at=COALESCE(dispatched_at,?1) WHERE id=?2 AND workspace_id=?3`).bind(result.dispatchedAt, item.id, item.workspace_id).run(); synced += 1 } catch { /* retry on the next scheduled sync */ } } return synced }

export function renderLetter(row: DispatchRow, sender: SenderProfile, address: PostalAddress) {
  const services = json<string[]>(row.radar_service_focus_json ?? row.service_focus_json, [])
  const variables: Record<string, string> = { company_name: row.company_name, company_number: row.company_number, incorporation_date: row.incorporation_date ?? "", sic_codes: json<string[]>(row.sic_codes_json, []).join(", "), location: row.location ?? `${address.town}, ${address.postcode}`, registered_office_address: addressLines(address), agency_name: sender.agencyName, service_focus: services.join(", "), opt_out_reference: row.suppression_reference }
  const replace = (value: string | null | undefined) => (value ?? "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key) => escapeHtml(variables[key] ?? ""))
  const logoUrl = normalizeExternalUrl(sender.logoUrl)
  const website = normalizeExternalUrl(sender.website)
  const logo = logoUrl ? `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(sender.agencyName)}" style="max-height:48px;max-width:180px" />` : `<strong>${escapeHtml(sender.agencyName)}</strong>`
  const accent = normalizeAccentColor(sender.accentColor)
  const primary = normalizeAccentColor(sender.primaryColor ?? "#111827")
  const text = normalizeAccentColor(sender.textColor ?? "#111827")
  const font = normalizeFont(sender.fontFamily)
  const ctaUrl = normalizeExternalUrl(row.cta_url)
  const websiteLine = website ? ` · ${escapeHtml(website)}` : ""
  const layout = normalizeLetterLayout(json<LetterLayout | null>(row.layout_json, null), { subject: row.subject, bodyHtml: row.body_html, ctaText: row.cta_text ?? undefined, ctaUrl: row.cta_url ?? undefined, signature: row.signature })
  const design = printDesign(layout.design?.preset ?? "minimal", accent, primary, font)
  const renderBlock = (item: LetterLayout["blocks"][number], compact = false) => {
    const align = normalizeAlignment(item.align)
    const content = replace(item.content)
    if (item.type === "brand") return `<div style="text-align:${align};margin-bottom:24px">${logo}</div>`
    if (item.type === "recipient") return `<div style="margin:0 0 24px"><strong>To:</strong><br>${escapeHtml(row.company_name)}<br>${escapeHtml(addressLines(address))}</div>`
    if (item.type === "heading") return `<h2 style="color:${primary};text-align:${align};margin:0 0 18px">${content}</h2>`
    if (item.type === "paragraph") return `<p style="text-align:${align};margin:0 0 12px;line-height:1.55">${content}</p>`
    if (item.type === "list") { const entries = item.content?.trim() === "{{service_focus}}" || item.items?.some((entry) => entry.trim() === "{{service_focus}}") ? services : (item.items?.length ? item.items : [item.content ?? ""]); return `<ul style="margin:0 0 14px;padding-left:22px">${entries.filter(Boolean).map((entry) => `<li>${replace(entry)}</li>`).join("")}</ul>` }
    if (item.type === "image") { const url = normalizeExternalUrl(item.url); return url ? `<p style="text-align:${align}"><img src="${escapeAttr(url)}" alt="${escapeAttr(item.alt ?? "")}" style="max-width:100%;max-height:240px" /></p>` : "" }
    if (item.type === "cta") { const url = normalizeExternalUrl(item.url ?? row.cta_url); return content && url ? `<p style="text-align:${align};margin:${compact ? 0 : 18}px 0"><a href="${escapeAttr(url)}" style="display:block;background:${accent};color:#000;padding:13px 16px;text-align:center;text-decoration:none;font-weight:700">${content}</a></p>` : "" }
    if (item.type === "qr") { const direct = normalizeExternalUrl(item.url ?? row.cta_url); const url = row.qr_tracking_token && direct ? `https://companyradar.uk/r/${row.qr_tracking_token}` : direct; const px = item.size === "large" ? 112 : item.size === "medium" ? 96 : 80; return url ? `<div style="text-align:center;margin:${compact ? 0 : 18}px 0"><img src="${qrSvgDataUrl(url, primary)}" alt="QR code" width="${px}" height="${px}" style="display:inline-block" />${item.content ? `<div style="font-size:10px;line-height:1.2">${content}</div>` : ""}</div>` : "" }
    if (item.type === "signature") return `<p style="text-align:${align};margin:22px 0;font-weight:700">${content || replace(row.signature)}</p>`
    if (item.type === "divider") return `<hr style="border:0;border-top:1px solid ${primary};margin:18px 0">`
    if (item.type === "spacer") return `<div style="height:24px"></div>`
    if (item.type === "footer") return `<footer style="margin-top:22px;border-top:1px solid ${primary};padding-top:10px;font-size:10px;color:${text}">${escapeHtml(sender.agencyName)}${websiteLine} · ${escapeHtml(sender.replyEmail)} · ${escapeHtml(sender.optOutText)} Reference: ${escapeHtml(row.suppression_reference)}</footer>`
    return ""
  }
  const rendered: string[] = []
  for (let index = 0; index < layout.blocks.length; index += 1) { const item = layout.blocks[index]; const next = layout.blocks[index + 1]; if (item.type === "cta" && next?.type === "qr") { rendered.push(`<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin:16px 0;padding:14px;border:1px solid ${primary};background:${accent}12"><div style="flex:1">${renderBlock(item, true)}</div><div style="flex:0 0 120px">${renderBlock(next, true)}</div></div>`); index += 1 } else rendered.push(renderBlock(item)) }
  return `<article style="box-sizing:border-box;color:${text};max-width:794px;min-height:1123px;position:relative;overflow:hidden;${design}">${printDecor(layout.design?.preset ?? "minimal", accent, primary)}<div style="position:relative;z-index:1">${rendered.join("")}</div></article>`
}
export function emptyAddress(): PostalAddress { return { address1: "", town: "", postcode: "", country: "GB" } }
function addressLines(address: PostalAddress) { return [address.address1, address.address2, address.town, address.county, address.postcode, address.country].filter(Boolean).join(", ") }
function shortRef() { return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase() }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!) }
function escapeAttr(value: string) { return escapeHtml(value) }
function normalizeFont(value: string | null | undefined) { return ["Arial", "Georgia", "Helvetica", "Times New Roman"].includes(value ?? "") ? value! : "Arial" }
function normalizeAlignment(value: string | null | undefined): "left" | "center" | "right" { return value === "center" || value === "right" ? value : "left" }
function normalizeProviderStatus(value: string) { const normalized = value.toLowerCase(); if (normalized.includes("dispatch")) return "dispatched"; if (normalized.includes("production") || normalized.includes("process")) return "production"; if (normalized.includes("fail") || normalized.includes("cancel")) return "failed"; return "submitted" }
function printDesign(preset: string, _accent: string, _primary: string, font: string) { if (preset === "modern") return `font-family:Helvetica,Arial,sans-serif;padding:90px 72px;`; if (preset === "editorial") return `font-family:Georgia,serif;padding:124px 72px 90px;`; return `font-family:${escapeAttr(font)},Arial,sans-serif;padding:90px 72px;` }
function printDecor(preset: string, accent: string, primary: string) {
  const span = (style: string) => `<span aria-hidden="true" style="position:absolute;display:block;z-index:0;pointer-events:none;${style}"></span>`
  if (preset === "modern") return [span(`left:0;right:0;top:0;height:12px;background:${accent}`), span(`left:64px;right:64px;bottom:45px;height:1px;background:${primary}`)].join("")
  if (preset === "editorial") return [span(`left:64px;right:64px;top:94px;height:1px;background:${accent}`), span(`left:64px;right:64px;bottom:45px;height:1px;background:${accent}`)].join("")
  return [span(`left:0;top:0;bottom:0;width:8px;background:${accent}`), span(`right:64px;top:58px;width:176px;height:1px;background:${primary}`)].join("")
}
interface TemplateRow { id: string; workspace_id: string; name: string; subject: string; body_html: string; cta_text: string | null; cta_url: string | null; signature: string; is_default: number; created_at: string; source_template_id: string | null; segment_slug: string | null; template_version: string; is_platform_template: number; is_campaign_snapshot?: number; pricing_version: string; price_pence: number | null; currency: string | null; service_focus_json?: string; layout_json?: string | null }
interface BatchRow { id: string; name: string; template_id: string; radar_id: string | null; batch_kind: string | null; status: string; credit_reserved: number; created_at: string }
interface ItemRow { id: string; batch_id: string; company_number: string; company_name: string; status: string; provider_status: string | null; scheduled_at: string | null; submission_unknown_at: string | null; preview_opened_at: string | null; last_error: string | null; created_at: string; qr_scan_count?: number; qr_first_scanned_at?: string | null; qr_last_scanned_at?: string | null; manual_recipient_json?: string | null }
export interface DispatchRow { id: string; company_number: string; company_name: string; manual_recipient_json?: string | null; suppression_reference: string; idempotency_key: string; qr_tracking_token?: string | null; subject: string; body_html: string; cta_text: string | null; cta_url: string | null; signature: string; layout_json?: string | null; service_focus_json?: string | null; radar_service_focus_json?: string | null; incorporation_date?: string | null; sic_codes_json?: string | null; location?: string | null }
function mapTemplate(row: TemplateRow): LetterTemplate { return { id: row.id, workspaceId: row.workspace_id, name: row.name, subject: row.subject, bodyHtml: row.body_html, ctaText: row.cta_text ?? undefined, ctaUrl: row.cta_url ?? undefined, signature: row.signature, isDefault: Boolean(row.is_default), createdAt: row.created_at, sourceTemplateId: row.source_template_id, segmentSlug: row.segment_slug, templateVersion: row.template_version, isPlatformTemplate: Boolean(row.is_platform_template), isCampaignSnapshot: Boolean(row.is_campaign_snapshot), pricingVersion: row.pricing_version, pricePence: row.price_pence ?? undefined, currency: row.currency ?? "GBP", serviceFocus: json<string[]>(row.service_focus_json, []), layout: normalizeLetterLayout(json<LetterLayout | null>(row.layout_json, null), { subject: row.subject, bodyHtml: row.body_html, ctaText: row.cta_text ?? undefined, ctaUrl: row.cta_url ?? undefined, signature: row.signature }) } }
function qrTarget(layout: LetterLayout | null) { const raw = layout?.blocks.find((item) => item.type === "qr")?.url; return normalizeExternalUrl(raw) || null }
function secureToken() { const bytes = crypto.getRandomValues(new Uint8Array(24)); return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") }
function normalizeManualRecipient(input: ManualRecipient): ManualRecipient {
  const name = input?.name?.trim()
  const address = input?.address
  if (!name || name.length > 120) throw new Error("Enter a valid recipient name.")
  if (!address?.address1?.trim() || !address.town?.trim() || !address.postcode?.trim()) throw new Error("Complete the recipient address and postcode.")
  const postcode = address.postcode.trim().toUpperCase().replace(/\s+/g, " ")
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(postcode)) throw new Error("Enter a valid UK postcode.")
  const clean = (value: string | undefined, max = 120) => value?.trim().slice(0, max) || undefined
  return { name, address: { address1: clean(address.address1)!, address2: clean(address.address2), town: clean(address.town, 80)!, county: clean(address.county, 80), postcode, country: "United Kingdom" } }
}
function publicDeliveryStatus(status: string, providerStatus: string | null) {
  if (providerStatus === "submission_unknown") return "Needs review"
  return ({ pending_approval: "Preview ready", sending: "Preparing", submitted: "Scheduled", production: "In production", dispatched: "Dispatched", failed: "Failed / credit refunded", blocked: "Needs review" } as Record<string, string>)[status] ?? status.replaceAll("_", " ")
}
function publicDeliveryError(value: string | null) { return value ? value.replace(/Frankk/gi, "The print service") : null }
