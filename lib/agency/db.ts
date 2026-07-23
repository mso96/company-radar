import type { CompanyRecord } from "@/lib/types"
import type {
  AgencyEvent,
  AgencyEventType,
  AgencyLead,
  AgencyRadar,
  AgencySegment,
  AgencyTemplateLibraryItem,
  AgencySession,
  CreateRadarInput,
  WatchRelationship,
  WatchlistCompany,
  WebhookEndpoint,
  WorkspaceRole,
} from "@/lib/agency/types"

const DAY_MS = 24 * 60 * 60 * 1000

export async function ensureAgencyUserAndWorkspace(db: D1Database, emailInput: string) {
  const email = emailInput.trim().toLowerCase()
  const now = new Date().toISOString()
  const existing = await db.prepare(`SELECT id FROM agency_users WHERE email = ?1`).bind(email).first<{ id: string }>()
  const userId = existing?.id ?? crypto.randomUUID()
  if (!existing) {
    await db.prepare(`INSERT INTO agency_users (id, email, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)`).bind(userId, email, now).run()
  }
  const membership = await db.prepare(`SELECT workspace_id FROM agency_workspace_members WHERE user_id = ?1 ORDER BY created_at ASC LIMIT 1`).bind(userId).first<{ workspace_id: string }>()
  if (membership) return { userId, workspaceId: membership.workspace_id }
  const workspaceId = crypto.randomUUID()
  const workspaceName = `${email.split("@")[0] || "Agency"} workspace`
  await db.batch([
    db.prepare(`INSERT INTO agency_workspaces (id, name, owner_user_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)`).bind(workspaceId, workspaceName, userId, now),
    db.prepare(`INSERT INTO agency_workspace_members (workspace_id, user_id, role, created_at) VALUES (?1, ?2, 'owner', ?3)`).bind(workspaceId, userId, now),
  ])
  return { userId, workspaceId }
}

export async function createMagicLink(db: D1Database, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const { userId } = await ensureAgencyUserAndWorkspace(db, normalizedEmail)
  const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`
  const now = new Date()
  await db.prepare(`INSERT INTO agency_magic_links (id, user_id, token_hash, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5)`).bind(crypto.randomUUID(), userId, hashToken(token), new Date(now.getTime() + 15 * 60 * 1000).toISOString(), now.toISOString()).run()
  return token
}

export async function consumeMagicLink(db: D1Database, token: string) {
  const now = new Date().toISOString()
  const link = await db.prepare(`SELECT user_id FROM agency_magic_links WHERE token_hash = ?1 AND consumed_at IS NULL AND expires_at > ?2`).bind(hashToken(token), now).first<{ user_id: string }>()
  if (!link) return null
  const sessionToken = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`
  await db.batch([
    db.prepare(`UPDATE agency_magic_links SET consumed_at = ?1 WHERE token_hash = ?2`).bind(now, hashToken(token)),
    db.prepare(`INSERT INTO agency_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5)`).bind(crypto.randomUUID(), link.user_id, hashToken(sessionToken), new Date(Date.now() + 30 * DAY_MS).toISOString(), now),
  ])
  return sessionToken
}

export async function getAgencySession(db: D1Database, token: string): Promise<AgencySession | null> {
  const row = await db.prepare(`SELECT s.user_id, u.email, m.workspace_id, w.name AS workspace_name, m.role FROM agency_sessions s JOIN agency_users u ON u.id = s.user_id JOIN agency_workspace_members m ON m.user_id = u.id JOIN agency_workspaces w ON w.id = m.workspace_id WHERE s.token_hash = ?1 AND s.expires_at > ?2 ORDER BY m.created_at ASC LIMIT 1`).bind(hashToken(token), new Date().toISOString()).first<{ user_id: string; email: string; workspace_id: string; workspace_name: string; role: WorkspaceRole }>()
  return row ? { userId: row.user_id, email: row.email, workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role } : null
}

export async function listWorkspaceMembers(db: D1Database, workspaceId: string) {
  const rows = await db.prepare(`SELECT u.email, m.role FROM agency_workspace_members m JOIN agency_users u ON u.id = m.user_id WHERE m.workspace_id = ?1 ORDER BY m.created_at ASC`).bind(workspaceId).all<{ email: string; role: WorkspaceRole }>()
  return rows.results ?? []
}

export async function listAgencyScanSessions(db: D1Database): Promise<AgencySession[]> {
  const rows = await db.prepare(`SELECT u.id AS user_id, u.email, m.workspace_id, w.name AS workspace_name, m.role FROM agency_workspace_members m JOIN agency_users u ON u.id = m.user_id JOIN agency_workspaces w ON w.id = m.workspace_id WHERE m.role = 'owner' AND (EXISTS (SELECT 1 FROM agency_radars r WHERE r.workspace_id = m.workspace_id AND r.is_active = 1) OR EXISTS (SELECT 1 FROM agency_company_watchlist c WHERE c.workspace_id = m.workspace_id))`).all<{ user_id: string; email: string; workspace_id: string; workspace_name: string; role: WorkspaceRole }>()
  return (rows.results ?? []).map((row) => ({ userId: row.user_id, email: row.email, workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role }))
}

export async function inviteWorkspaceMember(db: D1Database, workspaceId: string, email: string) {
  const person = await ensureAgencyUserAndWorkspace(db, email)
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO agency_workspace_members (workspace_id, user_id, role, created_at) VALUES (?1, ?2, 'member', ?3) ON CONFLICT(workspace_id, user_id) DO NOTHING`).bind(workspaceId, person.userId, now).run()
}

export async function listRadars(db: D1Database, workspaceId: string): Promise<AgencyRadar[]> {
  const rows = await db.prepare(`SELECT r.*, s.sic_code FROM agency_radars r LEFT JOIN agency_radar_sic_codes s ON s.radar_id = r.id WHERE r.workspace_id = ?1 ORDER BY r.created_at DESC, s.sic_code ASC`).bind(workspaceId).all<RadarRow>()
  const radars = new Map<string, AgencyRadar>()
  for (const row of rows.results ?? []) {
    const current = radars.get(row.id)
    if (current) { if (row.sic_code) current.sicCodes.push(row.sic_code); continue }
    radars.set(row.id, mapRadar(row))
  }
  return Array.from(radars.values())
}

export async function createRadar(db: D1Database, workspaceId: string, input: CreateRadarInput) {
  const now = new Date().toISOString(); const id = crypto.randomUUID()
  const sicCodes = Array.from(new Set(input.sicCodes.map((code) => code.trim()).filter(Boolean)))
  if (!input.name.trim() || sicCodes.length === 0) throw new Error("A radar needs a name and at least one SIC code.")
  const cities = Array.from(new Set((input.cities ?? (input.city ? [input.city] : [])).map((city) => city.trim()).filter(Boolean)))
  const segmentSlugs = Array.from(new Set((input.segmentSlugs ?? (input.segmentSlug ? [input.segmentSlug] : [])).map((slug) => slug.trim()).filter(Boolean)))
  const serviceFocus = Array.from(new Set((input.serviceFocus ?? []).map((service) => service.trim()).filter(Boolean)))
  await db.batch([
    db.prepare(`INSERT INTO agency_radars (id, workspace_id, name, city, region, keywords_json, company_types_json, event_types_json, delivery_frequency, is_active, auto_queue_letters, mail_template_id, segment_slug, company_age_days, company_statuses_json, postcode_prefixes_json, daily_send_limit, monthly_send_limit, approval_required, activated_at, created_at, updated_at, cities_json, segment_slugs_json, service_focus_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?19, ?19, ?20, ?21, ?22)`).bind(id, workspaceId, input.name.trim(), nullable(cities[0]), nullable(input.region), JSON.stringify(normalizeList(input.keywords)), JSON.stringify(normalizeList(input.companyTypes)), JSON.stringify(input.eventTypes?.length ? input.eventTypes : ["company.incorporated"]), input.deliveryFrequency ?? "daily", input.autoQueueLetters ? 1 : 0, nullable(input.mailTemplateId), nullable(segmentSlugs[0]), input.companyAgeDays ?? 30, JSON.stringify(normalizeList(input.companyStatuses?.length ? input.companyStatuses : ["active"])), JSON.stringify(normalizeList(input.postcodePrefixes)), Math.max(1, input.dailySendLimit ?? 20), Math.max(1, input.monthlySendLimit ?? 400), input.approvalRequired === false ? 0 : 1, now, JSON.stringify(cities), JSON.stringify(segmentSlugs), JSON.stringify(serviceFocus)),
    ...sicCodes.map((code) => db.prepare(`INSERT INTO agency_radar_sic_codes (radar_id, sic_code) VALUES (?1, ?2)`).bind(id, code)),
  ])
  return id
}

export async function listAgencySegments(db: D1Database): Promise<AgencySegment[]> {
  const rows = await db.prepare(`SELECT * FROM agency_segment_catalog WHERE is_active = 1 ORDER BY featured_rank IS NULL, featured_rank ASC, name ASC`).all<SegmentRow>()
  return (rows.results ?? []).map(mapSegment)
}

export async function getAgencySegment(db: D1Database, slug: string): Promise<AgencySegment | null> {
  const row = await db.prepare(`SELECT * FROM agency_segment_catalog WHERE slug = ?1 AND is_active = 1`).bind(slug).first<SegmentRow>()
  return row ? mapSegment(row) : null
}

export async function listTemplateLibrary(db: D1Database, segmentSlug?: string): Promise<AgencyTemplateLibraryItem[]> {
  const query = segmentSlug ? db.prepare(`SELECT * FROM agency_template_library WHERE is_active = 1 AND segment_slug = ?1 ORDER BY name ASC`).bind(segmentSlug) : db.prepare(`SELECT * FROM agency_template_library WHERE is_active = 1 ORDER BY segment_slug ASC`)
  const rows = await query.all<TemplateLibraryRow>()
  return (rows.results ?? []).map(mapTemplateLibrary)
}

export async function cloneTemplateFromLibrary(db: D1Database, workspaceId: string, sourceTemplateId: string) {
  const source = await db.prepare(`SELECT * FROM agency_template_library WHERE id = ?1 AND is_active = 1`).bind(sourceTemplateId).first<TemplateLibraryRow>()
  if (!source) throw new Error("Template not found.")
  const id = crypto.randomUUID(); const now = new Date().toISOString()
  await db.prepare(`INSERT INTO agency_letter_templates (id, workspace_id, name, subject, body_html, cta_text, cta_url, signature, is_default, created_at, updated_at, source_template_id, segment_slug, template_version, is_platform_template, pricing_version, service_focus_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, ?9, ?10, ?11, ?12, 0, ?13, ?14)`).bind(id, workspaceId, source.name, source.subject, source.body_html, source.cta_text, source.cta_url, source.signature, now, source.id, source.segment_slug, source.version, source.version, source.service_focus_json ?? "[]").run()
  return id
}

export async function updateRadarStatus(db: D1Database, workspaceId: string, radarId: string, isActive: boolean) {
  const now = new Date().toISOString()
  await db.prepare(`UPDATE agency_radars SET is_active = ?1, activated_at = CASE WHEN ?1 = 1 THEN COALESCE(activated_at, ?2) ELSE activated_at END, paused_at = CASE WHEN ?1 = 0 THEN ?2 ELSE paused_at END, updated_at = ?2 WHERE id = ?3 AND workspace_id = ?4`).bind(isActive ? 1 : 0, now, radarId, workspaceId).run()
}

export async function listWatchlist(db: D1Database, workspaceId: string): Promise<WatchlistCompany[]> {
  const rows = await db.prepare(`SELECT id, company_number, company_name, relationship_type, updated_at FROM agency_company_watchlist WHERE workspace_id = ?1 ORDER BY updated_at DESC`).bind(workspaceId).all<{ id: string; company_number: string; company_name: string | null; relationship_type: WatchRelationship; updated_at: string }>()
  return (rows.results ?? []).map((row) => ({ id: row.id, companyNumber: row.company_number, companyName: row.company_name, relationshipType: row.relationship_type, updatedAt: row.updated_at }))
}

export async function addWatchlistCompany(db: D1Database, workspaceId: string, input: { companyNumber: string; companyName?: string; relationshipType: WatchRelationship }) {
  const companyNumber = input.companyNumber.trim().toUpperCase()
  if (!companyNumber) throw new Error("Company number is required.")
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO agency_company_watchlist (id, workspace_id, company_number, company_name, relationship_type, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(workspace_id, company_number) DO UPDATE SET company_name = COALESCE(excluded.company_name, agency_company_watchlist.company_name), relationship_type = excluded.relationship_type, updated_at = excluded.updated_at`).bind(crypto.randomUUID(), workspaceId, companyNumber, nullable(input.companyName), input.relationshipType, now).run()
}

export async function listLeads(db: D1Database, workspaceId: string): Promise<AgencyLead[]> {
  const rows = await db.prepare(`SELECT l.*, r.name AS radar_name FROM agency_leads l JOIN agency_radars r ON r.id = l.radar_id WHERE l.workspace_id = ?1 ORDER BY l.score DESC, l.created_at DESC LIMIT 200`).bind(workspaceId).all<LeadRow>()
  return (rows.results ?? []).map(mapLead)
}

export async function upsertLead(db: D1Database, input: { workspaceId: string; radar: AgencyRadar; company: CompanyRecord; matchReasons: string[]; score: number }) {
  const now = new Date().toISOString(); const id = crypto.randomUUID()
  const result = await db.prepare(`INSERT INTO agency_leads (id, workspace_id, radar_id, company_number, company_name, incorporation_date, location, region, sic_codes_json, match_reasons_json, score, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12) ON CONFLICT(radar_id, company_number) DO NOTHING`).bind(id, input.workspaceId, input.radar.id, input.company.companyNumber, input.company.companyName, input.company.incorporationDate, input.company.location, input.company.region, JSON.stringify(input.company.sicCodes), JSON.stringify(input.matchReasons), input.score, now).run() as { meta?: { changes?: number } }
  return (result.meta?.changes ?? 0) > 0 ? id : null
}

export async function listEvents(db: D1Database, workspaceId: string): Promise<AgencyEvent[]> {
  const rows = await db.prepare(`SELECT e.*, w.relationship_type FROM agency_events e LEFT JOIN agency_company_watchlist w ON w.id = e.watchlist_id WHERE e.workspace_id = ?1 ORDER BY e.event_at DESC LIMIT 200`).bind(workspaceId).all<EventRow>()
  return (rows.results ?? []).map((row) => ({ id: row.id, companyNumber: row.company_number, companyName: row.company_name, eventType: row.event_type as AgencyEventType, eventAt: row.event_at, relationshipType: row.relationship_type, sourceRecord: safeJson<Record<string, unknown>>(row.source_record_json, {}), createdAt: row.created_at }))
}

export async function insertEvent(db: D1Database, input: Omit<AgencyEvent, "id" | "relationshipType" | "createdAt"> & { workspaceId: string; watchlistId?: string | null; fingerprint: string }) {
  const now = new Date().toISOString()
  const result = await db.prepare(`INSERT INTO agency_events (id, workspace_id, watchlist_id, company_number, company_name, event_type, event_at, source_key, source_record_json, fingerprint, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) ON CONFLICT(fingerprint) DO NOTHING`).bind(crypto.randomUUID(), input.workspaceId, input.watchlistId ?? null, input.companyNumber, input.companyName, input.eventType, input.eventAt, input.eventType, JSON.stringify(input.sourceRecord), input.fingerprint, now).run() as { meta?: { changes?: number } }
  return (result.meta?.changes ?? 0) > 0
}

export async function getSourceSnapshot(db: D1Database, watchlistId: string, sourceKey: string) {
  return db.prepare(`SELECT source_hash FROM agency_company_source_snapshots WHERE watchlist_id = ?1 AND source_key = ?2`).bind(watchlistId, sourceKey).first<{ source_hash: string }>()
}

export async function saveSourceSnapshot(db: D1Database, watchlistId: string, sourceKey: string, sourceHash: string) {
  await db.prepare(`INSERT INTO agency_company_source_snapshots (watchlist_id, source_key, source_hash, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(watchlist_id, source_key) DO UPDATE SET source_hash = excluded.source_hash, updated_at = excluded.updated_at`).bind(watchlistId, sourceKey, sourceHash, new Date().toISOString()).run()
}

export async function getWebhookForRadar(db: D1Database, workspaceId: string, radarId: string): Promise<WebhookEndpoint | null> {
  const row = await db.prepare(`SELECT e.* FROM agency_webhook_endpoints e JOIN agency_radars r ON r.id = e.radar_id WHERE e.radar_id = ?1 AND r.workspace_id = ?2`).bind(radarId, workspaceId).first<WebhookRow>()
  return row ? mapWebhook(row, false) : null
}

export async function saveWebhook(db: D1Database, workspaceId: string, radarId: string, url: string, isActive = true) {
  const radar = await db.prepare(`SELECT id FROM agency_radars WHERE id = ?1 AND workspace_id = ?2`).bind(radarId, workspaceId).first<{ id: string }>()
  if (!radar) throw new Error("Radar not found.")
  const now = new Date().toISOString(); const secret = `whsec_${crypto.randomUUID().replaceAll("-", "")}`
  await db.prepare(`INSERT INTO agency_webhook_endpoints (id, radar_id, url, secret, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(radar_id) DO UPDATE SET url = excluded.url, is_active = excluded.is_active, updated_at = excluded.updated_at`).bind(crypto.randomUUID(), radarId, url, secret, isActive ? 1 : 0, now).run()
  const saved = await getWebhookForRadar(db, workspaceId, radarId)
  return { ...saved!, secret }
}

export async function queueWebhookDelivery(db: D1Database, radarId: string, eventName: "lead.created" | "company.event.detected", payload: Record<string, unknown>) {
  const endpoint = await db.prepare(`SELECT id FROM agency_webhook_endpoints WHERE radar_id = ?1 AND is_active = 1`).bind(radarId).first<{ id: string }>()
  if (!endpoint) return
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO agency_webhook_deliveries (id, endpoint_id, event_name, payload_json, attempt_count, next_attempt_at, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)`).bind(crypto.randomUUID(), endpoint.id, eventName, JSON.stringify(payload), now).run()
}

export async function claimPendingWebhookDeliveries(db: D1Database, limit = 25) {
  const rows = await db.prepare(`SELECT d.*, e.url, e.secret FROM agency_webhook_deliveries d JOIN agency_webhook_endpoints e ON e.id = d.endpoint_id WHERE d.delivered_at IS NULL AND d.attempt_count < 3 AND d.next_attempt_at <= ?1 AND e.is_active = 1 ORDER BY d.created_at ASC LIMIT ?2`).bind(new Date().toISOString(), limit).all<DeliveryRow>()
  return rows.results ?? []
}

export async function recordWebhookAttempt(db: D1Database, deliveryId: string, result: { status?: number; error?: string }) {
  const current = await db.prepare(`SELECT attempt_count FROM agency_webhook_deliveries WHERE id = ?1`).bind(deliveryId).first<{ attempt_count: number }>()
  if (!current) return
  const attempt = current.attempt_count + 1; const delivered = result.status && result.status >= 200 && result.status < 300
  const next = new Date(Date.now() + Math.pow(2, attempt) * 60_000).toISOString()
  await db.prepare(`UPDATE agency_webhook_deliveries SET attempt_count = ?1, next_attempt_at = ?2, delivered_at = ?3, last_status = ?4, last_error = ?5 WHERE id = ?6`).bind(attempt, next, delivered ? new Date().toISOString() : null, result.status ?? null, result.error ?? null, deliveryId).run()
}

export async function recordExport(db: D1Database, workspaceId: string, userId: string, exportKind: string) {
  await db.prepare(`INSERT INTO agency_exports (id, workspace_id, user_id, export_kind, created_at) VALUES (?1, ?2, ?3, ?4, ?5)`).bind(crypto.randomUUID(), workspaceId, userId, exportKind, new Date().toISOString()).run()
}

export function hashToken(value: string) { return fnv1a(value) }
export function fnv1a(value: string) { let hash = 0x811c9dc5; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) } return (hash >>> 0).toString(16).padStart(8, "0") }

interface RadarRow { id: string; workspace_id: string; name: string; city: string | null; region: string | null; cities_json?: string; segment_slugs_json?: string; service_focus_json?: string; keywords_json: string; company_types_json: string; event_types_json: string; delivery_frequency: "daily" | "weekly"; is_active: number; auto_queue_letters: number; mail_template_id: string | null; segment_slug: string | null; company_age_days: number | null; company_statuses_json: string; postcode_prefixes_json: string; daily_send_limit: number; monthly_send_limit: number; approval_required: number; activated_at: string | null; paused_at: string | null; created_at: string; sic_code: string | null }
interface LeadRow { id: string; workspace_id: string; radar_id: string; company_number: string; company_name: string; incorporation_date: string; location: string; region: string; sic_codes_json: string; match_reasons_json: string; score: number; created_at: string; radar_name: string }
interface EventRow { id: string; company_number: string; company_name: string; event_type: string; event_at: string; source_record_json: string; created_at: string; relationship_type: WatchRelationship | null }
interface WebhookRow { id: string; radar_id: string; url: string; secret: string; is_active: number; created_at: string }
interface DeliveryRow { id: string; event_name: "lead.created" | "company.event.detected"; payload_json: string; attempt_count: number; url: string; secret: string }
interface SegmentRow { slug: string; name: string; description: string; persona: string; sic_codes_json: string; default_filters_json: string; default_template_id: string | null; price_pence: number; currency: string; featured_rank: number | null; is_active: number }
interface TemplateLibraryRow { id: string; segment_slug: string; name: string; description: string; subject: string; body_html: string; cta_text: string | null; cta_url: string | null; signature: string; merge_fields_json: string; price_pence: number; currency: string; version: string; service_focus_json?: string }
function mapRadar(row: RadarRow): AgencyRadar { return { id: row.id, workspaceId: row.workspace_id, name: row.name, city: row.city, region: row.region, cities: safeJson<string[]>(row.cities_json, row.city ? [row.city] : []), segmentSlugs: safeJson<string[]>(row.segment_slugs_json, row.segment_slug ? [row.segment_slug] : []), serviceFocus: safeJson<string[]>(row.service_focus_json, []), keywords: safeJson<string[]>(row.keywords_json, []), companyTypes: safeJson<string[]>(row.company_types_json, []), eventTypes: safeJson<AgencyEventType[]>(row.event_types_json, ["company.incorporated"]), sicCodes: row.sic_code ? [row.sic_code] : [], deliveryFrequency: row.delivery_frequency, isActive: Boolean(row.is_active), autoQueueLetters: Boolean(row.auto_queue_letters), mailTemplateId: row.mail_template_id, segmentSlug: row.segment_slug, companyAgeDays: row.company_age_days, companyStatuses: safeJson<string[]>(row.company_statuses_json, ["active"]), postcodePrefixes: safeJson<string[]>(row.postcode_prefixes_json, []), dailySendLimit: row.daily_send_limit, monthlySendLimit: row.monthly_send_limit, approvalRequired: Boolean(row.approval_required), activatedAt: row.activated_at, pausedAt: row.paused_at, createdAt: row.created_at } }
function mapSegment(row: SegmentRow): AgencySegment { return { slug: row.slug, name: row.name, description: row.description, persona: row.persona, sicCodes: safeJson<string[]>(row.sic_codes_json, []), defaultFilters: safeJson<AgencySegment["defaultFilters"]>(row.default_filters_json, {}), defaultTemplateId: row.default_template_id, pricePence: row.price_pence, currency: row.currency, featuredRank: row.featured_rank, isActive: Boolean(row.is_active) } }
function mapTemplateLibrary(row: TemplateLibraryRow): AgencyTemplateLibraryItem { return { id: row.id, segmentSlug: row.segment_slug, name: row.name, description: row.description, subject: row.subject, bodyHtml: row.body_html, ctaText: row.cta_text ?? undefined, ctaUrl: row.cta_url ?? undefined, signature: row.signature, mergeFields: safeJson<string[]>(row.merge_fields_json, []), pricePence: row.price_pence, currency: row.currency, version: row.version, serviceFocus: safeJson<string[]>(row.service_focus_json, []) } }
function mapLead(row: LeadRow): AgencyLead { return { id: row.id, workspaceId: row.workspace_id, radarId: row.radar_id, company: { companyName: row.company_name, companyNumber: row.company_number, incorporationDate: row.incorporation_date, location: row.location, region: row.region, sicCodes: safeJson<string[]>(row.sic_codes_json, []), matchedKeywords: [], status: "active", type: "" }, matchReasons: safeJson<string[]>(row.match_reasons_json, []), score: row.score, createdAt: row.created_at, radarName: row.radar_name } }
function mapWebhook(row: WebhookRow, includeSecret: boolean): WebhookEndpoint { return { id: row.id, radarId: row.radar_id, url: row.url, isActive: Boolean(row.is_active), createdAt: row.created_at, ...(includeSecret ? { secret: row.secret } : {}) } }
function safeJson<T>(value: string | null | undefined, fallback: T): T { try { return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
function normalizeList(values?: string[]) { return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean))) }
function nullable(value?: string) { const normalized = value?.trim(); return normalized || null }
