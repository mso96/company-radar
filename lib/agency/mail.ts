import type { AgencyLead, CreditPack, LetterTemplate, MailBatch, MailItem, PostalAddress, SenderProfile } from "@/lib/agency/types"
import { getStannpLetter } from "@/lib/agency/stannp"
import { normalizeAccentColor, normalizeExternalUrl } from "@/lib/agency/branding"

const now = () => new Date().toISOString()
const json = <T>(value: string | null | undefined, fallback: T) => { try { return value ? JSON.parse(value) as T : fallback } catch { return fallback } }

export async function getCreditBalance(db: D1Database, workspaceId: string) {
  const row = await db.prepare(`SELECT COALESCE(SUM(delta), 0) AS balance FROM agency_credit_ledger WHERE workspace_id = ?1`).bind(workspaceId).first<{ balance: number }>()
  return Number(row?.balance ?? 0)
}

export async function getCreditPacks(db: D1Database): Promise<CreditPack[]> {
  const row = await db.prepare(`SELECT value FROM app_config WHERE key = 'agency_credit_packs'`).first<{ value: string }>()
  const packs = json<CreditPack[]>(row?.value, [])
  return packs.filter((pack) => pack.active && pack.id && pack.credits > 0 && pack.pricePence > 0)
}

export async function getSenderProfile(db: D1Database, workspaceId: string): Promise<SenderProfile | null> {
  const row = await db.prepare(`SELECT agency_name, address_json, reply_email, website, opt_out_text, logo_url, accent_color FROM agency_sender_profiles WHERE workspace_id = ?1`).bind(workspaceId).first<{ agency_name: string; address_json: string; reply_email: string; website: string | null; opt_out_text: string; logo_url: string | null; accent_color: string | null }>()
  return row ? { agencyName: row.agency_name, address: json<PostalAddress>(row.address_json, emptyAddress()), replyEmail: row.reply_email, website: normalizeExternalUrl(row.website), optOutText: row.opt_out_text, logoUrl: normalizeExternalUrl(row.logo_url), accentColor: normalizeAccentColor(row.accent_color) } : null
}

export async function saveSenderProfile(db: D1Database, workspaceId: string, input: SenderProfile) {
  if (!input.agencyName.trim() || !input.replyEmail.trim() || !input.address.address1.trim() || !input.address.town.trim() || !input.address.postcode.trim()) throw new Error("Complete your sender name, reply email and postal address.")
  const accentColor = normalizeAccentColor(input.accentColor)
  const logoUrl = normalizeExternalUrl(input.logoUrl)
  const website = normalizeExternalUrl(input.website)
  await db.prepare(`INSERT INTO agency_sender_profiles (workspace_id, agency_name, address_json, reply_email, website, opt_out_text, logo_url, accent_color, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ON CONFLICT(workspace_id) DO UPDATE SET agency_name=excluded.agency_name,address_json=excluded.address_json,reply_email=excluded.reply_email,website=excluded.website,opt_out_text=excluded.opt_out_text,logo_url=excluded.logo_url,accent_color=excluded.accent_color,updated_at=excluded.updated_at`).bind(workspaceId, input.agencyName.trim(), JSON.stringify(input.address), input.replyEmail.trim(), website, input.optOutText.trim() || "To stop receiving marketing by post, use this reference.", logoUrl, accentColor, now()).run()
}

export async function listLetterTemplates(db: D1Database, workspaceId: string): Promise<LetterTemplate[]> {
  const rows = await db.prepare(`SELECT t.*, l.price_pence, l.currency FROM agency_letter_templates t LEFT JOIN agency_template_library l ON l.id = t.source_template_id WHERE t.workspace_id = ?1 ORDER BY t.is_default DESC, t.created_at DESC`).bind(workspaceId).all<TemplateRow>()
  return (rows.results ?? []).map(mapTemplate)
}

export async function saveLetterTemplate(db: D1Database, workspaceId: string, input: Omit<LetterTemplate, "id" | "workspaceId" | "createdAt"> & { id?: string }) {
  if (!input.name.trim() || !input.subject.trim() || !input.bodyHtml.trim() || !input.signature.trim()) throw new Error("Template name, subject, message and signature are required.")
  const id = input.id ?? crypto.randomUUID(); const timestamp = now()
  if (input.isDefault) await db.prepare(`UPDATE agency_letter_templates SET is_default = 0 WHERE workspace_id = ?1`).bind(workspaceId).run()
  const services = Array.from(new Set((input.serviceFocus ?? []).map((service) => service.trim()).filter(Boolean)))
  await db.prepare(`INSERT INTO agency_letter_templates (id, workspace_id, name, subject, body_html, cta_text, cta_url, signature, is_default, created_at, updated_at, service_focus_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?11) ON CONFLICT(id) DO UPDATE SET name=excluded.name,subject=excluded.subject,body_html=excluded.body_html,cta_text=excluded.cta_text,cta_url=excluded.cta_url,signature=excluded.signature,is_default=excluded.is_default,service_focus_json=excluded.service_focus_json,updated_at=excluded.updated_at`).bind(id, workspaceId, input.name.trim(), input.subject.trim(), input.bodyHtml.trim(), input.ctaText?.trim() || null, input.ctaUrl?.trim() || null, input.signature.trim(), input.isDefault ? 1 : 0, timestamp, JSON.stringify(services)).run()
  return id
}

export async function listMailBatches(db: D1Database, workspaceId: string): Promise<MailBatch[]> {
  const rows = await db.prepare(`SELECT id, name, template_id, status, credit_reserved, created_at FROM agency_mail_batches WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 50`).bind(workspaceId).all<BatchRow>()
  return (rows.results ?? []).map((row) => ({ id: row.id, name: row.name, templateId: row.template_id, status: row.status, creditReserved: row.credit_reserved, createdAt: row.created_at }))
}

export async function listMailItems(db: D1Database, workspaceId: string): Promise<MailItem[]> {
  const rows = await db.prepare(`SELECT id, batch_id, company_number, company_name, status, provider_status, provider_pdf_url, last_error, created_at FROM agency_mail_items WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 100`).bind(workspaceId).all<ItemRow>()
  return (rows.results ?? []).map((row) => ({ id: row.id, batchId: row.batch_id, companyNumber: row.company_number, companyName: row.company_name, status: row.status, providerStatus: row.provider_status, providerPdfUrl: row.provider_pdf_url, lastError: row.last_error, createdAt: row.created_at }))
}

export async function createMailBatchFromLeads(db: D1Database, input: { workspaceId: string; userId: string; templateId: string; leadIds: string[]; name?: string }) {
  const template = await db.prepare(`SELECT id FROM agency_letter_templates WHERE id = ?1 AND workspace_id = ?2`).bind(input.templateId, input.workspaceId).first()
  if (!template) throw new Error("Choose a letter template from this workspace.")
  const ids = Array.from(new Set(input.leadIds.filter(Boolean))).slice(0, 100)
  if (!ids.length) throw new Error("Select at least one lead.")
  const placeholders = ids.map(() => "?").join(",")
  const leads = await db.prepare(`SELECT id, company_number, company_name FROM agency_leads WHERE workspace_id = ?1 AND id IN (${placeholders})`).bind(input.workspaceId, ...ids).all<{ id: string; company_number: string; company_name: string }>()
  if (!(leads.results ?? []).length) throw new Error("Selected leads are no longer available.")
  const id = crypto.randomUUID(); const timestamp = now()
  const statements = [db.prepare(`INSERT INTO agency_mail_batches (id, workspace_id, template_id, name, status, created_by_user_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'pending_approval', ?5, ?6, ?6)`).bind(id, input.workspaceId, input.templateId, input.name?.trim() || `New company outreach — ${new Date().toLocaleDateString("en-GB")}`, input.userId, timestamp)]
  for (const lead of leads.results ?? []) statements.push(db.prepare(`INSERT INTO agency_mail_items (id, workspace_id, batch_id, lead_id, company_number, company_name, status, suppression_reference, idempotency_key, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending_approval', ?7, ?8, ?9, ?9) ON CONFLICT(batch_id, company_number) DO NOTHING`).bind(crypto.randomUUID(), input.workspaceId, id, lead.id, lead.company_number, lead.company_name, shortRef(), crypto.randomUUID(), timestamp))
  await db.batch(statements)
  return id
}

export async function autoQueueLead(db: D1Database, input: { workspaceId: string; radarId: string; leadId: string; companyNumber: string; companyName: string }) {
  const radar = await db.prepare(`SELECT mail_template_id FROM agency_radars WHERE id = ?1 AND workspace_id = ?2 AND auto_queue_letters = 1`).bind(input.radarId, input.workspaceId).first<{ mail_template_id: string | null }>()
  if (!radar?.mail_template_id) return
  const template = await db.prepare(`SELECT id FROM agency_letter_templates WHERE id = ?1 AND workspace_id = ?2`).bind(radar.mail_template_id, input.workspaceId).first()
  if (!template) return
  await createMailBatchFromLeads(db, { workspaceId: input.workspaceId, userId: "system", templateId: radar.mail_template_id, leadIds: [input.leadId], name: `Radar ${input.radarId} — automatic queue` })
}

export async function getMailItemForDispatch(db: D1Database, workspaceId: string, itemId: string) {
  return db.prepare(`SELECT i.*, b.template_id, t.subject, t.body_html, t.cta_text, t.cta_url, t.signature, t.service_focus_json, l.incorporation_date, l.sic_codes_json, l.location, r.service_focus_json AS radar_service_focus_json FROM agency_mail_items i JOIN agency_mail_batches b ON b.id = i.batch_id JOIN agency_letter_templates t ON t.id = b.template_id LEFT JOIN agency_leads l ON l.id = i.lead_id LEFT JOIN agency_radars r ON r.id = l.radar_id WHERE i.id = ?1 AND i.workspace_id = ?2`).bind(itemId, workspaceId).first<DispatchRow>()
}

export async function listPendingMailItems(db: D1Database, workspaceId: string, batchId: string) { const rows = await db.prepare(`SELECT id FROM agency_mail_items WHERE workspace_id = ?1 AND batch_id = ?2 AND status = 'pending_approval'`).bind(workspaceId, batchId).all<{ id: string }>(); return rows.results ?? [] }
export async function reserveCredits(db: D1Database, workspaceId: string, batchId: string, count: number) { const balance = await getCreditBalance(db, workspaceId); if (balance < count) throw new Error(`Insufficient credits. You need ${count} credits and have ${balance}.`); const timestamp = now(); await db.batch([db.prepare(`INSERT INTO agency_credit_ledger (id, workspace_id, delta, reason, reference_id, created_at) VALUES (?1, ?2, ?3, 'mail_reservation', ?4, ?5)`).bind(crypto.randomUUID(), workspaceId, -count, batchId, timestamp), db.prepare(`UPDATE agency_mail_batches SET status='approved', credit_reserved=?1, approved_at=?2, updated_at=?2 WHERE id=?3 AND workspace_id=?4`).bind(count, timestamp, batchId, workspaceId)]) }
export async function refundCredit(db: D1Database, workspaceId: string, itemId: string) { await db.prepare(`INSERT INTO agency_credit_ledger (id, workspace_id, delta, reason, reference_id, created_at) VALUES (?1, ?2, 1, 'mail_refund', ?3, ?4)`).bind(crypto.randomUUID(), workspaceId, itemId, now()).run() }
export async function addCredits(db: D1Database, input: { workspaceId: string; credits: number; checkoutSessionId: string }) { await db.prepare(`INSERT INTO agency_credit_ledger (id, workspace_id, delta, reason, stripe_checkout_session_id, created_at) VALUES (?1, ?2, ?3, 'credit_purchase', ?4, ?5) ON CONFLICT(stripe_checkout_session_id) DO NOTHING`).bind(crypto.randomUUID(), input.workspaceId, input.credits, input.checkoutSessionId, now()).run() }
export async function updateMailItem(db: D1Database, itemId: string, changes: { status: string; address?: PostalAddress; html?: string; stannpId?: string; costPence?: number; providerStatus?: string; pdfUrl?: string; error?: string }) { await db.prepare(`UPDATE agency_mail_items SET status=?1,address_json=COALESCE(?2,address_json),rendered_html=COALESCE(?3,rendered_html),stannp_letter_id=COALESCE(?4,stannp_letter_id),provider_cost_pence=COALESCE(?5,provider_cost_pence),provider_status=COALESCE(?6,provider_status),provider_pdf_url=COALESCE(?7,provider_pdf_url),last_error=?8,last_synced_at=?9,updated_at=?9 WHERE id=?10`).bind(changes.status, changes.address ? JSON.stringify(changes.address) : null, changes.html ?? null, changes.stannpId ?? null, changes.costPence ?? null, changes.providerStatus ?? null, changes.pdfUrl ?? null, changes.error ?? null, now(), itemId).run() }
export async function completeMailBatch(db: D1Database, workspaceId: string, batchId: string, status: "completed" | "failed") { await db.prepare(`UPDATE agency_mail_batches SET status = ?1, updated_at = ?2 WHERE id = ?3 AND workspace_id = ?4`).bind(status, now(), batchId, workspaceId).run() }
export async function suppressCompany(db: D1Database, workspaceId: string, companyNumber: string, reason?: string) { const timestamp = now(); await db.batch([db.prepare(`INSERT INTO agency_suppressions (id, workspace_id, company_number, reason, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(workspace_id, company_number) DO NOTHING`).bind(crypto.randomUUID(), workspaceId, companyNumber, reason ?? null, timestamp), db.prepare(`UPDATE agency_mail_items SET status='suppressed',updated_at=?1 WHERE workspace_id=?2 AND company_number=?3 AND status IN ('draft','pending_approval','approved')`).bind(timestamp, workspaceId, companyNumber)]) }
export async function getMailItemByReference(db: D1Database, reference: string) { return db.prepare(`SELECT id, workspace_id, company_number FROM agency_mail_items WHERE suppression_reference = ?1`).bind(reference).first<{ id: string; workspace_id: string; company_number: string }>() }
export async function syncStannpMailStatuses(db: D1Database, apiKey: string) { const rows = await db.prepare(`SELECT id, stannp_letter_id FROM agency_mail_items WHERE stannp_letter_id IS NOT NULL AND status IN ('submitted','production') ORDER BY updated_at ASC LIMIT 100`).all<{ id: string; stannp_letter_id: string }>(); let synced = 0; for (const item of rows.results ?? []) { try { const letter = await getStannpLetter(apiKey, item.stannp_letter_id); const status = normalizeProviderStatus(letter.status); await updateMailItem(db, item.id, { status, providerStatus: letter.status, costPence: letter.costPence, pdfUrl: letter.pdfUrl }); synced += 1 } catch { /* leave the existing item available for a later sync */ } } return synced }

export function renderLetter(row: DispatchRow, sender: SenderProfile, address: PostalAddress) {
  const services = json<string[]>(row.radar_service_focus_json ?? row.service_focus_json, [])
  const variables: Record<string, string> = { company_name: row.company_name, company_number: row.company_number, incorporation_date: row.incorporation_date ?? "", sic_codes: json<string[]>(row.sic_codes_json, []).join(", "), location: row.location ?? `${address.town}, ${address.postcode}`, registered_office_address: addressLines(address), agency_name: sender.agencyName, service_focus: services.join(", "), opt_out_reference: row.suppression_reference }
  const replace = (value: string | null | undefined) => (value ?? "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key) => escapeHtml(variables[key] ?? ""))
  const logoUrl = normalizeExternalUrl(sender.logoUrl)
  const website = normalizeExternalUrl(sender.website)
  const logo = logoUrl ? `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(sender.agencyName)}" style="max-height:48px;max-width:180px" />` : `<strong>${escapeHtml(sender.agencyName)}</strong>`
  const accent = normalizeAccentColor(sender.accentColor)
  const ctaUrl = normalizeExternalUrl(row.cta_url)
  const websiteLine = website ? ` · ${escapeHtml(website)}` : ""
  return `<article style="font-family:Arial,sans-serif;border-top:8px solid ${escapeAttr(accent)};padding:24px">${logo}<p>${replace(row.subject)}</p>${sanitizeTemplateHtml(replace(row.body_html))}${row.cta_text && ctaUrl ? `<p><a href="${escapeAttr(ctaUrl)}" style="background:${escapeAttr(accent)};color:#000;padding:8px 12px;text-decoration:none">${replace(row.cta_text)}</a></p>` : ""}<p>${replace(row.signature)}</p><hr><small>${escapeHtml(sender.agencyName)}${websiteLine} · ${escapeHtml(sender.replyEmail)} · ${escapeHtml(sender.optOutText)} Reference: ${escapeHtml(row.suppression_reference)}</small></article>`
}
export function emptyAddress(): PostalAddress { return { address1: "", town: "", postcode: "", country: "GB" } }
function addressLines(address: PostalAddress) { return [address.address1, address.address2, address.town, address.county, address.postcode, address.country].filter(Boolean).join(", ") }
function shortRef() { return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase() }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!) }
function escapeAttr(value: string) { return escapeHtml(value) }
function sanitizeTemplateHtml(value: string) { return value.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "") }
function normalizeProviderStatus(value: string) { const normalized = value.toLowerCase(); if (normalized.includes("dispatch")) return "dispatched"; if (normalized.includes("production") || normalized.includes("process")) return "production"; if (normalized.includes("fail") || normalized.includes("cancel")) return "failed"; return "submitted" }
interface TemplateRow { id: string; workspace_id: string; name: string; subject: string; body_html: string; cta_text: string | null; cta_url: string | null; signature: string; is_default: number; created_at: string; source_template_id: string | null; segment_slug: string | null; template_version: string; is_platform_template: number; pricing_version: string; price_pence: number | null; currency: string | null; service_focus_json?: string }
interface BatchRow { id: string; name: string; template_id: string; status: string; credit_reserved: number; created_at: string }
interface ItemRow { id: string; batch_id: string; company_number: string; company_name: string; status: string; provider_status: string | null; provider_pdf_url: string | null; last_error: string | null; created_at: string }
interface DispatchRow { id: string; company_number: string; company_name: string; suppression_reference: string; idempotency_key: string; subject: string; body_html: string; cta_text: string | null; cta_url: string | null; signature: string; service_focus_json?: string | null; radar_service_focus_json?: string | null; incorporation_date?: string | null; sic_codes_json?: string | null; location?: string | null }
function mapTemplate(row: TemplateRow): LetterTemplate { return { id: row.id, workspaceId: row.workspace_id, name: row.name, subject: row.subject, bodyHtml: row.body_html, ctaText: row.cta_text ?? undefined, ctaUrl: row.cta_url ?? undefined, signature: row.signature, isDefault: Boolean(row.is_default), createdAt: row.created_at, sourceTemplateId: row.source_template_id, segmentSlug: row.segment_slug, templateVersion: row.template_version, isPlatformTemplate: Boolean(row.is_platform_template), pricingVersion: row.pricing_version, pricePence: row.price_pence ?? undefined, currency: row.currency ?? "GBP", serviceFocus: json<string[]>(row.service_focus_json, []) } }
