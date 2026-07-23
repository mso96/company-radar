import { redirect } from "next/navigation"
import { getCurrentAgencySession } from "@/lib/agency/auth"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"
import { listAgencySegments, listEvents, listLeads, listRadars, listTemplateLibrary, listWatchlist, listWorkspaceMembers } from "@/lib/agency/db"
import { AgencyWorkspace } from "@/components/agency/agency-workspace"
import { getLocalAgencyCatalog, getLocalAgencyDemoData, isLocalAgencyDemoSession } from "@/lib/agency/demo"
import { getCreditBalance, getCreditPacks, getSenderProfile, listLetterTemplates, listMailBatches, listMailItems } from "@/lib/agency/mail"

export const dynamic = "force-dynamic"

export default async function AgencyPage() {
  const session = await getCurrentAgencySession()
  if (!session) redirect("/agency-login")
  if (isLocalAgencyDemoSession(session)) {
    const catalog = getLocalAgencyCatalog()
    return <AgencyWorkspace session={session} {...getLocalAgencyDemoData()} segments={catalog.segments} templateLibrary={catalog.templates} templates={[{ id: "demo-template", workspaceId: session.workspaceId, name: "New company introduction", subject: "A quick idea for {{company_name}}", bodyHtml: "Hello {{company_name}},", ctaText: "Book a call", ctaUrl: "https://example.com", signature: "Northstar Digital", isDefault: true, createdAt: "2026-07-13T08:00:00.000Z" }]} sender={null} batches={[]} mailItems={[]} creditBalance={12} creditPacks={[]} />
  }
  const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
  const [radars, leads, events, watchlist, members, templates, sender, batches, mailItems, creditBalance, creditPacks, segments, templateLibrary] = await Promise.all([listRadars(db, session.workspaceId), listLeads(db, session.workspaceId), listEvents(db, session.workspaceId), listWatchlist(db, session.workspaceId), listWorkspaceMembers(db, session.workspaceId), listLetterTemplates(db, session.workspaceId), getSenderProfile(db, session.workspaceId), listMailBatches(db, session.workspaceId), listMailItems(db, session.workspaceId), getCreditBalance(db, session.workspaceId), getCreditPacks(db), listAgencySegments(db), listTemplateLibrary(db)])
  return <AgencyWorkspace session={session} radars={radars} leads={leads} events={events} watchlist={watchlist} members={members} templates={templates} templateLibrary={templateLibrary} segments={segments} sender={sender} batches={batches} mailItems={mailItems} creditBalance={creditBalance} creditPacks={creditPacks} />
}
