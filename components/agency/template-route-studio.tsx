"use client"

import { TemplateStudio } from "@/components/agency/agency-workspace"
import type { AgencyLead, AgencyTemplateLibraryItem, LetterLayout, LetterTemplate, SenderProfile } from "@/lib/agency/types"

type Draft = { id?: string; name: string; subject: string; bodyHtml: string; ctaText?: string; ctaUrl?: string; signature: string; isDefault?: boolean; sourceTemplateId?: string; serviceFocus?: string[]; layout?: LetterLayout }

export function TemplateRouteStudio({ templates, templateLibrary, leads, sender, owner, templateId, returnTo }: { templates: LetterTemplate[]; templateLibrary: AgencyTemplateLibraryItem[]; leads: AgencyLead[]; sender: SenderProfile | null; owner: boolean; templateId: string; returnTo: string }) {
  async function api(path: string, body?: unknown, method = "POST") { const response = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error ?? "Request failed."); return payload }
  async function save(draft: Draft) { let id = draft.id; if (!id && draft.sourceTemplateId) id = (await api("/api/app/templates/clone", { sourceTemplateId: draft.sourceTemplateId })).id; return (await api("/api/app/mail/templates", { ...draft, id, sourceTemplateId: undefined })).id as string }
  async function archive(id: string) { await api("/api/app/mail/templates", { id }, "DELETE") }
  async function saveSender(input: SenderProfile) { await api("/api/app/mail/sender", input, "PUT") }
  return <main className="min-h-screen bg-muted/40 p-3 sm:p-5"><div className="mx-auto max-w-[1600px]"><TemplateStudio templates={templates} templateLibrary={templateLibrary} leads={leads} sender={sender} owner={owner} onSave={save} onArchive={archive} onSaveSender={saveSender} initialTemplateId={templateId} returnTo={returnTo} /></div></main>
}
