"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ExternalLink, RefreshCw, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CampaignDetail as Detail } from "@/lib/agency/types"

type Filter = "eligible" | "in_batch" | "sent" | "suppressed"

export function CampaignDetail({ initial, creditBalance, owner }: { initial: Detail; creditBalance: number; owner: boolean }) {
  const router = useRouter()
  const [detail, setDetail] = React.useState(initial)
  const [filter, setFilter] = React.useState<Filter>("eligible")
  const [selected, setSelected] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const campaign = detail.campaign
  const shown = detail.leads.filter((lead) => lead.eligibility === filter)
  const pendingBatches = detail.batches.filter((batch) => batch.status === "pending_approval")
  const batchIds = new Set(detail.batches.map((batch) => batch.id))
  const history = detail.mailItems.filter((item) => batchIds.has(item.batchId) && item.status !== "pending_approval")

  async function api(path: string, body?: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error ?? "Request failed.")
    return payload
  }
  async function refresh() {
    const response = await fetch(`/api/app/campaigns/${campaign.id}`, { cache: "no-store" })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error ?? "Unable to refresh campaign.")
    setDetail(payload)
  }
  async function action(key: string, work: () => Promise<void>) {
    setBusy(key); setNotice(null)
    try { await work() } catch (error) { setNotice(error instanceof Error ? error.message : "Request failed.") } finally { setBusy(null) }
  }
  function toggleLead(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length >= 20 ? current : [...current, id])
  }
  async function prepareBatch() {
    await action("batch", async () => {
      await api(`/api/app/campaigns/${campaign.id}/batches`, { leadIds: selected, name: `${campaign.name} · ${selected.length} letters` })
      setSelected([]); setNotice("Approval batch prepared. Generate the real Frankk preview before sending."); await refresh()
    })
  }
  async function preview(batchId: string) {
    await action(`preview:${batchId}`, async () => {
      const result = await api("/api/app/mail/preview", { batchId })
      window.open(result.previewUrl, "_blank", "noopener,noreferrer")
      setNotice(`Real Frankk preview ready for ${result.recipient}. Nothing has been charged or sent.`); await refresh()
    })
  }
  async function approve(batchId: string) {
    await action(`approve:${batchId}`, async () => {
      const result = await api("/api/app/mail/approve", { batchId })
      const scheduled = result.results.filter((item: { status: string }) => item.status === "scheduled").length
      setNotice(`${scheduled} letters scheduled with Frankk.`); await refresh()
    })
  }
  async function checkNow() {
    await action("scan", async () => {
      const result = await api(`/api/app/radars/${campaign.id}/scan`)
      setNotice(`Campaign checked. ${result.leads} new companies found.`); await refresh()
    })
  }
  async function deleteCampaign() {
    if (!window.confirm(`Delete “${campaign.name}”? It will disappear from the dashboard, but delivery history will be preserved.`)) return
    await action("delete", async () => {
      const response = await fetch(`/api/app/radars/${campaign.id}`, { method: "DELETE" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete campaign.")
      router.push("/app")
      router.refresh()
    })
  }

  return <main className="min-h-screen bg-muted/40 p-4 text-foreground sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 bg-background p-4">
        <div className="flex min-w-0 items-center gap-3"><Button asChild size="icon" variant="outline"><Link href="/app" aria-label="Back to campaigns"><ArrowLeft className="size-4" /></Link></Button><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-black">{campaign.name}</h1><Badge>{campaign.isActive ? "Active" : "Paused"}</Badge></div><p className="text-sm text-muted-foreground">Daily company scan · owner approval required</p></div></div>
        <div className="flex items-center gap-2"><Button asChild size="sm" variant="outline"><Link href="/app?view=credits" aria-label={`Open credits. Current balance ${creditBalance} credits`}>{creditBalance} credits</Link></Button>{owner ? <Button variant="outline" onClick={checkNow} disabled={busy === "scan"}><RefreshCw className="mr-2 size-4" />{busy === "scan" ? "Checking…" : "Check now"}</Button> : null}</div>
      </header>
      {notice ? <div className="border-2 bg-[hsl(var(--chart-3))] p-3 text-sm font-bold" role="status">{notice}</div> : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card><CardHeader><CardTitle>Overview</CardTitle><CardDescription>The campaign finds companies automatically. Nothing is mailed without your approval.</CardDescription></CardHeader><CardContent className="grid gap-4 text-sm sm:grid-cols-2"><Info label="Audience" value={`${campaign.sicCodes.join(", ") || "Custom"} · ${campaign.cities?.join(", ") || campaign.city || "All UK"}`} /><Info label="Company age" value={`New within ${campaign.companyAgeDays ?? 30} days`} /><Info label="Last checked" value={campaign.lastScanCompletedAt ? new Date(campaign.lastScanCompletedAt).toLocaleString("en-GB") : "Not checked yet"} /><Info label="Last result" value={campaign.lastScanError ? `Failed: ${campaign.lastScanError}` : `${campaign.lastScanLeads ?? 0} companies found`} /><Info label="Limits" value={`${campaign.dailySendLimit ?? 20}/day · ${campaign.monthlySendLimit ?? 400}/month`} /><Info label="QR response" value={`${detail.analytics.totalQrScans} scans · ${detail.analytics.companiesScanned} companies`} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Campaign letter</CardTitle><CardDescription>Frozen when this campaign was activated.</CardDescription></CardHeader><CardContent>{detail.template ? <div className="grid gap-3 sm:grid-cols-[150px_1fr]"><LetterThumb subject={detail.template.subject} body={detail.template.bodyHtml} preset={detail.template.layout?.design?.preset ?? "minimal"} /><div><p className="font-black">{detail.template.name}</p><p className="mt-1 text-sm capitalize text-muted-foreground">{detail.template.layout?.design?.preset ?? "minimal"} design</p><Button asChild className="mt-3" variant="outline"><Link href={`/app/templates/${detail.template.sourceTemplateId ?? detail.template.id}?returnTo=/app/campaigns/${campaign.id}`}>Create new version <ExternalLink className="ml-2 size-4" /></Link></Button></div></div> : <p className="text-sm text-destructive">The saved campaign letter could not be loaded.</p>}</CardContent></Card>
      </section>

      <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Matches</CardTitle><CardDescription>Select up to 20 eligible companies and prepare one approval batch.</CardDescription></div><Badge variant="outline">{detail.leads.length} total</Badge></div></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">{(["eligible", "in_batch", "sent", "suppressed"] as Filter[]).map((value) => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => { setFilter(value); setSelected([]) }} className="capitalize">{value.replace("_", " ")} · {detail.leads.filter((lead) => lead.eligibility === value).length}</Button>)}</div>
        {shown.length ? <div className="divide-y-2 border-2">{shown.map((lead) => { const checked = selected.includes(lead.id); return <label key={lead.id} className={`grid gap-3 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center ${filter === "eligible" ? "cursor-pointer" : "opacity-70"}`}><input type="checkbox" className="size-5" checked={checked} disabled={filter !== "eligible" || (!checked && selected.length >= 20)} onChange={() => toggleLead(lead.id)} /><div><p className="font-black">{lead.company.companyName}</p><p className="text-sm text-muted-foreground">{lead.company.companyNumber} · {lead.company.incorporationDate} · {lead.company.location}</p><p className="mt-1 text-xs">{lead.matchReasons.join(" · ")}</p></div><Badge variant="outline" className="capitalize">{lead.eligibility.replace("_", " ")}</Badge></label>})}</div> : <p className="border-2 border-dashed p-5 text-sm text-muted-foreground">No companies in this view.</p>}
        {filter === "eligible" ? <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 border-2 bg-background p-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]"><div><p className="font-black">{selected.length} selected</p><p className="text-sm text-muted-foreground">{selected.length} credits required · maximum 20 letters</p></div><Button disabled={!owner || selected.length === 0 || busy === "batch"} onClick={prepareBatch}>{busy === "batch" ? "Preparing…" : `Prepare ${selected.length} ${selected.length === 1 ? "letter" : "letters"}`} <Check className="ml-2 size-4" /></Button></div> : null}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Ready for approval</CardTitle><CardDescription>Open the real Frankk PDF before approving any physical mail.</CardDescription></CardHeader><CardContent>{pendingBatches.length ? <div className="space-y-3">{pendingBatches.map((batch) => { const count = detail.mailItems.filter((item) => item.batchId === batch.id).length; return <div key={batch.id} className="flex flex-wrap items-center justify-between gap-3 border-2 p-3"><div><p className="font-black">{batch.name}</p><p className="text-sm text-muted-foreground">{count} recipients · {count} credits · A4 single-sided · Second Class</p></div>{owner ? <div className="flex gap-2"><Button variant="outline" disabled={busy !== null} onClick={() => preview(batch.id)}>Real PDF preview</Button><Button disabled={busy !== null} onClick={() => approve(batch.id)}>Approve & schedule</Button></div> : null}</div>})}</div> : <p className="border-2 border-dashed p-5 text-sm text-muted-foreground">Select eligible matches to prepare an approval batch.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle>History</CardTitle><CardDescription>Frankk production status, failures, refunds and QR response.</CardDescription></CardHeader><CardContent>{history.length ? <div className="divide-y-2 border-2">{history.map((item) => <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto]"><div><p className="font-bold">{item.companyName}</p><p className="text-xs text-muted-foreground">{item.companyNumber} · {item.providerStatus ?? item.status}</p>{item.lastError ? <p className="mt-1 text-xs text-destructive">{item.lastError}</p> : null}</div><Badge variant="outline" className="capitalize">{item.status.replace("_", " ")}</Badge><span className="text-sm">{item.qrScanCount ?? 0} QR scans</span></div>)}</div> : <p className="border-2 border-dashed p-5 text-sm text-muted-foreground">Scheduled and dispatched letters will appear here.</p>}</CardContent></Card>

      {owner ? <Card className="border-destructive"><CardHeader><CardTitle>Delete campaign</CardTitle><CardDescription>Remove this campaign from your dashboard and stop future scans. Existing delivery and credit records are preserved.</CardDescription></CardHeader><CardContent><Button variant="destructive" disabled={busy !== null} onClick={deleteCampaign}><Trash2 className="mr-2 size-4" />{busy === "delete" ? "Deleting…" : "Delete campaign"}</Button></CardContent></Card> : null}
    </div>
  </main>
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="font-bold">{label}</p><p className="text-muted-foreground">{value}</p></div> }
function LetterThumb({ subject, body, preset }: { subject: string; body: string; preset: string }) { const plain = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); return <div className={`aspect-[210/297] overflow-hidden border-2 bg-white p-4 text-[6px] text-slate-900 ${preset === "editorial" ? "font-serif" : "font-sans"}`}><div className={preset === "modern" ? "mb-3 h-2 bg-slate-900" : "mb-3 h-px bg-slate-400"} /><p className="text-[8px] font-black">{subject}</p><p className="mt-3 leading-relaxed">{plain}</p></div> }
