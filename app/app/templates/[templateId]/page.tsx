import { redirect } from "next/navigation"
import { TemplateRouteStudio } from "@/components/agency/template-route-studio"
import { getCurrentAgencySession } from "@/lib/agency/auth"
import { listLeads, listTemplateLibrary } from "@/lib/agency/db"
import { getSenderProfile, listLetterTemplates } from "@/lib/agency/mail"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"

export const dynamic = "force-dynamic"

export default async function TemplatePage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const session = await getCurrentAgencySession()
  if (!session) redirect("/agency-login")
  const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
  const [templates, templateLibrary, leads, sender] = await Promise.all([listLetterTemplates(db, session.workspaceId), listTemplateLibrary(db), listLeads(db, session.workspaceId), getSenderProfile(db, session.workspaceId)])
  const requestedReturn = (await searchParams).returnTo
  const returnTo = requestedReturn?.startsWith("/app") ? requestedReturn : "/app"
  return <TemplateRouteStudio templates={templates} templateLibrary={templateLibrary} leads={leads} sender={sender} owner={session.role === "owner"} templateId={(await params).templateId} returnTo={returnTo} />
}
