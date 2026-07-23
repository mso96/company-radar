import { fetchCompaniesForSicAlerts, fetchCompanyEventSources } from "@/lib/companies-house"
import { fnv1a, getSourceSnapshot, insertEvent, listAgencyScanSessions, listRadars, listWatchlist, queueWebhookDelivery, saveSourceSnapshot, upsertLead } from "@/lib/agency/db"
import { deliverPendingWebhooks } from "@/lib/agency/webhooks"
import { autoQueueLead } from "@/lib/agency/mail"
import type { AgencyRadar, AgencySession } from "@/lib/agency/types"
import type { CompanyRecord } from "@/lib/types"

export async function scanWorkspaceRadars(db: D1Database, apiKey: string, session: AgencySession) {
  const radars = (await listRadars(db, session.workspaceId)).filter((radar) => radar.isActive)
  const today = new Date().toISOString().slice(0, 10)
  let leads = 0
  for (const radar of radars) {
    const companies = new Map<string, CompanyRecord>()
    for (const sicCode of radar.sicCodes) {
      for (const company of await fetchCompaniesForSicAlerts(apiKey, today, today, sicCode)) companies.set(company.companyNumber, company)
    }
    for (const company of companies.values()) {
      const reasons = matchRadar(radar, company)
      if (!reasons.length) continue
      const score = scoreLead(company, reasons)
      const leadId = await upsertLead(db, { workspaceId: session.workspaceId, radar, company, matchReasons: reasons, score })
      if (!leadId) continue
      leads += 1
      await autoQueueLead(db, { workspaceId: session.workspaceId, radarId: radar.id, leadId, companyNumber: company.companyNumber, companyName: company.companyName })
      await queueWebhookDelivery(db, radar.id, "lead.created", { version: "2026-07-13", type: "lead.created", workspaceId: session.workspaceId, radar: { id: radar.id, name: radar.name }, lead: { id: leadId, score, matchReasons: reasons, company: companyPayload(company) }, occurredAt: new Date().toISOString() })
    }
  }
  return { radars: radars.length, leads }
}

export async function runAgencyDailyScan(db: D1Database, apiKey: string) {
  const sessions = await listAgencyScanSessions(db)
  let leads = 0; let events = 0
  for (const session of sessions) {
    const radarResult = await scanWorkspaceRadars(db, apiKey, session)
    const watchlistResult = await scanWorkspaceWatchlist(db, apiKey, session)
    leads += radarResult.leads; events += watchlistResult.events
  }
  const deliveries = await deliverPendingWebhooks(db)
  return { workspaces: sessions.length, leads, events, deliveries }
}

export async function scanWorkspaceWatchlist(db: D1Database, apiKey: string, session: AgencySession) {
  const watchlist = await listWatchlist(db, session.workspaceId)
  let events = 0
  for (const watched of watchlist.slice(0, 100)) {
    const sources = await fetchCompanyEventSources(apiKey, watched.companyNumber)
    for (const source of sources) {
      const sourceHash = fnv1a(JSON.stringify(source.records))
      const previous = await getSourceSnapshot(db, watched.id, source.key)
      if (!previous) { await saveSourceSnapshot(db, watched.id, source.key, sourceHash); continue }
      if (previous.source_hash === sourceHash) continue
      for (const record of source.records.slice(0, 50)) {
        const fingerprint = fnv1a(`${watched.companyNumber}:${source.eventType}:${JSON.stringify(record)}`)
        const created = await insertEvent(db, { workspaceId: session.workspaceId, watchlistId: watched.id, companyNumber: watched.companyNumber, companyName: watched.companyName ?? watched.companyNumber, eventType: source.eventType, eventAt: source.eventAt(record), sourceRecord: record, fingerprint })
        if (!created) continue
        events += 1
        await queueForWorkspaceRadars(db, session, source.eventType, watched.companyNumber, watched.companyName ?? watched.companyNumber, record)
      }
      await saveSourceSnapshot(db, watched.id, source.key, sourceHash)
    }
  }
  const deliveries = await deliverPendingWebhooks(db)
  return { watched: watchlist.length, events, deliveries }
}

async function queueForWorkspaceRadars(db: D1Database, session: AgencySession, eventType: string, companyNumber: string, companyName: string, record: Record<string, unknown>) {
  for (const radar of (await listRadars(db, session.workspaceId)).filter((item) => item.isActive && item.eventTypes.includes(eventType as never))) {
    await queueWebhookDelivery(db, radar.id, "company.event.detected", { version: "2026-07-13", type: "company.event.detected", workspaceId: session.workspaceId, radar: { id: radar.id, name: radar.name }, company: { companyNumber, companyName, companiesHouseUrl: `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}` }, event: { type: eventType, record }, occurredAt: new Date().toISOString() })
  }
}

function matchRadar(radar: AgencyRadar, company: CompanyRecord) {
  const reasons = [`SIC: ${company.sicCodes.filter((code) => radar.sicCodes.includes(code)).join(", ")}`]
  const cities = radar.cities?.filter(Boolean) ?? (radar.city ? [radar.city] : [])
  if (cities.length && !cities.some((city) => company.location.toLowerCase().includes(city.toLowerCase()))) return []
  if (cities.length) reasons.push(`City: ${cities.join(", ")}`)
  if (radar.region && company.region !== radar.region) return []
  if (radar.region) reasons.push(`Region: ${radar.region}`)
  if (radar.companyTypes.length && !radar.companyTypes.includes(company.type)) return []
  if (radar.companyTypes.length) reasons.push(`Type: ${company.type}`)
  const keywordMatches = radar.keywords.filter((keyword) => company.companyName.toLowerCase().includes(keyword.toLowerCase()))
  if (radar.keywords.length && !keywordMatches.length) return []
  for (const keyword of keywordMatches) reasons.push(`Keyword: ${keyword}`)
  return reasons.filter(Boolean)
}

function scoreLead(company: CompanyRecord, reasons: string[]) { return Math.min(100, 40 + reasons.length * 12 + Math.min(company.matchedKeywords.length * 6, 18)) }
function companyPayload(company: CompanyRecord) { return { companyName: company.companyName, companyNumber: company.companyNumber, incorporationDate: company.incorporationDate, location: company.location, region: company.region, sicCodes: company.sicCodes, companiesHouseUrl: `https://find-and-update.company-information.service.gov.uk/company/${company.companyNumber}` } }
