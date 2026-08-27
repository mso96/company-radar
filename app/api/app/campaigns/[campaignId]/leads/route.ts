import { NextResponse } from "next/server"
import { fetchCompanyRecord } from "@/lib/companies-house"
import { upsertLead, listRadars } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const campaignId = (await context.params).campaignId
    const radar = (await listRadars(db, session.workspaceId)).find((item) => item.id === campaignId && item.isActive)
    if (!radar) throw new Error("Campaign not found.")
    const body = await request.json() as { companyNumber?: string }
    const companyNumber = body.companyNumber?.trim().toUpperCase()
    if (!companyNumber) throw new Error("Company number is required.")
    const existing = await db.prepare(`SELECT 1 AS found FROM agency_suppressions WHERE workspace_id=?1 AND company_number=?2 UNION ALL SELECT 1 FROM agency_leads WHERE workspace_id=?1 AND radar_id=?3 AND company_number=?2 LIMIT 1`).bind(session.workspaceId, companyNumber, campaignId).first()
    if (existing) throw new Error("This company is already suppressed or already in this campaign.")
    const apiKey = requireAgencyEnvValue((await getAgencyRuntimeEnv()).COMPANIES_HOUSE_API_KEY, "COMPANIES_HOUSE_API_KEY")
    const company = await fetchCompanyRecord(apiKey, companyNumber)
    const cutoff = new Date(); cutoff.setUTCDate(cutoff.getUTCDate() - Math.max(1, radar.companyAgeDays ?? 30))
    if (!company.incorporationDate || new Date(company.incorporationDate) < cutoff) throw new Error("This company is outside the campaign age range.")
    if (company.status !== "active") throw new Error("Only active companies can be added.")
    if (radar.sicCodes.length && !company.sicCodes.some((code) => radar.sicCodes.includes(code))) throw new Error("This company does not match the campaign SIC rules.")
    const reasons = [`SIC: ${company.sicCodes.filter((code) => radar.sicCodes.includes(code)).join(", ") || "Company listing"}`]
    const leadId = await upsertLead(db, { workspaceId: session.workspaceId, radar, company, matchReasons: reasons, score: 60 })
    if (!leadId) throw new Error("This company is already in this campaign.")
    return NextResponse.json({ ok: true, leadId })
  } catch (error) { return agencyError(error) }
}
