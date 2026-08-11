import { redirect } from "next/navigation"
import { NewCampaign } from "@/components/agency/new-campaign"
import { getCurrentAgencySession } from "@/lib/agency/auth"
import { listAgencySegments, listLeads, listTemplateLibrary } from "@/lib/agency/db"
import { getSenderProfile, listLetterTemplates } from "@/lib/agency/mail"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"
import { SIC_LABELS } from "@/lib/sic-codes"

export const dynamic = "force-dynamic"

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ templateId?: string; sicCodes?: string }> }) {
  const session = await getCurrentAgencySession()
  if (!session) redirect("/agency-login")
  const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
  const [segments, templateLibrary, templates, sender, leads] = await Promise.all([listAgencySegments(db), listTemplateLibrary(db), listLetterTemplates(db, session.workspaceId), getSenderProfile(db, session.workspaceId), listLeads(db, session.workspaceId)])
  const query = await searchParams
  const initialSicCodes = (query.sicCodes ?? "").split(",").map((code) => code.trim()).filter((code) => Boolean(SIC_LABELS[code])).slice(0, 20)
  return <NewCampaign segments={segments} templateLibrary={templateLibrary} templates={templates} sender={sender} sampleCompany={leads[0]?.company} initialTemplateId={query.templateId} initialSicCodes={initialSicCodes} />
}
