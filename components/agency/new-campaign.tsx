"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SegmentRadarWizard } from "@/components/agency/agency-workspace"
import { Button } from "@/components/ui/button"
import type { AgencyLead, AgencySegment, AgencyTemplateLibraryItem, LetterTemplate, SenderProfile } from "@/lib/agency/types"

type Values = { name: string; sicCodes: string[]; cities?: string[]; keywords?: string[]; deliveryFrequency?: "daily" | "weekly"; autoQueueLetters?: boolean; mailTemplateId?: string; templateLibraryId?: string; segmentSlug?: string; segmentSlugs?: string[]; serviceFocus?: string[]; companyAgeDays?: number; postcodePrefixes?: string[]; dailySendLimit?: number; monthlySendLimit?: number }

export function NewCampaign({ segments, templateLibrary, templates, sender, sampleCompany, initialTemplateId, initialSicCodes = [] }: { segments: AgencySegment[]; templateLibrary: AgencyTemplateLibraryItem[]; templates: LetterTemplate[]; sender: SenderProfile | null; sampleCompany?: AgencyLead["company"]; initialTemplateId?: string; initialSicCodes?: string[] }) {
  const router = useRouter()
  const [notice, setNotice] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  async function submit(values: Values) {
    setBusy(true); setNotice(null)
    try {
      let mailTemplateId = values.mailTemplateId
      if (!mailTemplateId && values.templateLibraryId) {
        const clone = await fetch("/api/app/templates/clone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceTemplateId: values.templateLibraryId }) })
        const payload = await clone.json(); if (!clone.ok) throw new Error(payload.error ?? "Unable to save the starter letter.")
        mailTemplateId = payload.id
      }
      const response = await fetch("/api/app/radars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, mailTemplateId, templateLibraryId: undefined, deliveryFrequency: "daily", autoQueueLetters: false, approvalRequired: true, eventTypes: ["company.incorporated"] }) })
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Unable to activate campaign.")
      sessionStorage.removeItem("company-radar-campaign-draft")
      router.push(`/app/campaigns/${payload.id}`); router.refresh()
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to activate campaign.") } finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1400px] space-y-5"><header className="flex items-center gap-3 border-b-2 bg-background p-4"><Button asChild size="icon" variant="outline"><Link href="/app" aria-label="Back to dashboard"><ArrowLeft className="size-4" /></Link></Button><div><h1 className="text-2xl font-black">Create campaign</h1><p className="text-sm text-muted-foreground">Choose an audience and letter. Activation starts a scan, not a physical send.</p></div></header>{notice ? <div className="border-2 bg-[hsl(var(--chart-3))] p-3 text-sm font-bold">{notice}</div> : null}{busy ? <div className="border-2 bg-background p-3 text-sm font-bold">Activating campaign and running the first scan…</div> : null}<SegmentRadarWizard segments={segments} templateLibrary={templateLibrary} workspaceTemplates={templates} sender={sender} sampleCompany={sampleCompany} onSubmit={submit} initialTemplateId={initialTemplateId} initialSicCodes={initialSicCodes} /></div></main>
}
