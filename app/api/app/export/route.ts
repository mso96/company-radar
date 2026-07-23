import { listEvents, listLeads, recordExport } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function GET(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext()
    const kind = new URL(request.url).searchParams.get("kind") === "events" ? "events" : "leads"
    const rows = kind === "leads" ? leadsCsv(await listLeads(db, session.workspaceId)) : eventsCsv(await listEvents(db, session.workspaceId))
    await recordExport(db, session.workspaceId, session.userId, kind)
    return new Response(rows, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="company-radar-${kind}.csv"`, "Cache-Control": "no-store" } })
  } catch (error) { return agencyError(error) }
}

function leadsCsv(leads: Awaited<ReturnType<typeof listLeads>>) {
  const header = ["company name", "company number", "location", "incorporation date", "SIC codes", "radar name", "event type", "event date", "match reasons", "Companies House URL"]
  return toCsv([header, ...leads.map((lead) => [lead.company.companyName, lead.company.companyNumber, lead.company.location, lead.company.incorporationDate, lead.company.sicCodes.join(" | "), lead.radarName ?? "", "company.incorporated", lead.company.incorporationDate, lead.matchReasons.join(" | "), companyUrl(lead.company.companyNumber)])])
}

function eventsCsv(events: Awaited<ReturnType<typeof listEvents>>) {
  const header = ["company name", "company number", "location", "incorporation date", "SIC codes", "radar name", "event type", "event date", "match reasons", "Companies House URL"]
  return toCsv([header, ...events.map((event) => [event.companyName, event.companyNumber, "", "", "", "", event.eventType, event.eventAt, event.relationshipType ?? "", companyUrl(event.companyNumber)])])
}
function companyUrl(companyNumber: string) { return `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}` }
function toCsv(rows: string[][]) { return `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")}\n` }
