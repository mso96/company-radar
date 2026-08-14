"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ExternalLink, Mail, RefreshCw, Search, Trash2 } from "lucide-react"
import { ScaledLetterPreview } from "@/components/agency/agency-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { CampaignDetail as Detail, SenderProfile } from "@/lib/agency/types"

type Filter = "eligible" | "in_batch" | "sent" | "suppressed"

export function CampaignDetail({ initial, creditBalance, owner, sender }: { initial: Detail; creditBalance: number; owner: boolean; sender: SenderProfile | null }) {
  const router = useRouter()
  const [detail, setDetail] = React.useState(initial)
  const [filter, setFilter] = React.useState<Filter>("eligible")
  const [selected, setSelected] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [testOpen, setTestOpen] = React.useState(false)
  const [leadSearch, setLeadSearch] = React.useState("")
  const [visibleCount, setVisibleCount] = React.useState(20)
  const [testRecipient, setTestRecipient] = React.useState({ name: "Sefa Oruç", address1: "Flat 30, 45 Watermill Lane", address2: "Bedstone Court", town: "London", county: "", postcode: "N18 1FE" })
  const campaign = detail.campaign
  const shown = detail.leads.filter((lead) => lead.eligibility === filter && `${lead.company.companyName} ${lead.company.companyNumber} ${lead.company.location ?? ""} ${lead.company.sicCodes.join(" ")}`.toLowerCase().includes(leadSearch.trim().toLowerCase()))
  const visibleLeads = shown.slice(0, visibleCount)
  const campaignBatches = detail.batches.filter((batch) => batch.batchKind !== "test")
  const testBatches = detail.batches.filter((batch) => batch.batchKind === "test" && batch.status === "pending_approval")
  const pendingBatches = campaignBatches.filter((batch) => batch.status === "pending_approval")
  const history = detail.mailItems.filter((item) => item.status !== "pending_approval")
  const approvalSafe = Boolean(detail.template && sender)

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
      setSelected([]); setNotice("Approval batch prepared. Generate and open the PDF preview before sending."); await refresh()
    })
  }
  async function preview(batchId: string) {
    await action(`preview:${batchId}`, async () => {
      const result = await api("/api/app/mail/preview", { batchId })
      window.open(result.previewUrl, "_blank", "noopener,noreferrer")
      setNotice(`PDF preview ready for ${result.recipient}. Nothing has been charged or sent.`); await refresh()
    })
  }
  async function approve(batchId: string) {
    await action(`approve:${batchId}`, async () => {
      const result = await api("/api/app/mail/approve", { batchId })
      const scheduled = result.results.filter((item: { status: string }) => item.status === "scheduled").length
      setNotice(`${scheduled} ${scheduled === 1 ? "letter" : "letters"} scheduled for printing and post.`); await refresh()
    })
  }
  async function createTestPreview() {
    const previewWindow = window.open("", "_blank")
    await action("test-preview", async () => {
      try {
        const result = await api(`/api/app/campaigns/${campaign.id}/test-letter/preview`, { recipient: { name: testRecipient.name, address: { address1: testRecipient.address1, address2: testRecipient.address2, town: testRecipient.town, county: testRecipient.county, postcode: testRecipient.postcode, country: "United Kingdom" } } })
        if (previewWindow) { previewWindow.opener = null; previewWindow.location.href = new URL(result.previewUrl, window.location.origin).href } else window.open(result.previewUrl, "_blank", "noopener,noreferrer")
        setTestOpen(false)
        setNotice(`Test letter preview ready for ${result.recipient.name}. Nothing has been charged or sent. Estimated dispatch: ${formatDate(result.dispatchDate)}.`)
        await refresh()
      } catch (error) { previewWindow?.close(); throw error }
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
        <div className="flex flex-wrap items-center gap-2"><Button asChild size="sm" variant="outline"><Link href="/app?view=credits" aria-label={`Open credits. Current balance ${creditBalance} credits`}>{creditBalance} credits</Link></Button>{owner ? <><Dialog open={testOpen} onOpenChange={setTestOpen}><DialogTrigger asChild><Button><Mail className="mr-2 size-4" />Send test letter</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto border-2 sm:max-w-xl"><DialogHeader><DialogTitle>Send a test letter</DialogTitle><DialogDescription>Create a private PDF preview using this campaign’s saved letter. Nothing is printed or charged until you open the preview and approve it.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label="Recipient name" value={testRecipient.name} onChange={(value) => setTestRecipient((current) => ({ ...current, name: value }))} wide /><Field label="Address line 1" value={testRecipient.address1} onChange={(value) => setTestRecipient((current) => ({ ...current, address1: value }))} wide /><Field label="Address line 2" value={testRecipient.address2} onChange={(value) => setTestRecipient((current) => ({ ...current, address2: value }))} wide /><Field label="Town / city" value={testRecipient.town} onChange={(value) => setTestRecipient((current) => ({ ...current, town: value }))} /><Field label="County (optional)" value={testRecipient.county} onChange={(value) => setTestRecipient((current) => ({ ...current, county: value }))} /><Field label="Postcode" value={testRecipient.postcode} onChange={(value) => setTestRecipient((current) => ({ ...current, postcode: value }))} /><div className="flex items-end"><p className="pb-2 text-sm font-bold">United Kingdom</p></div></div><div className="border-2 bg-muted p-3 text-sm"><p className="font-black">{detail.template?.name ?? "Campaign letter"}</p><p className="mt-1 text-muted-foreground">Preview is free · Physical send is 1 credit · Owner approval required</p></div><Button disabled={busy !== null} onClick={createTestPreview}>{busy === "test-preview" ? "Generating preview…" : "Generate PDF preview"}</Button></DialogContent></Dialog><Button variant="outline" onClick={checkNow} disabled={busy === "scan"}><RefreshCw className="mr-2 size-4" />{busy === "scan" ? "Checking…" : "Check now"}</Button></> : null}</div>
      </header>
      {notice ? <div className="border-2 bg-[hsl(var(--chart-3))] p-3 text-sm font-bold" role="status">{notice}</div> : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card><CardHeader><CardTitle>Overview</CardTitle><CardDescription>The campaign finds companies automatically. Nothing is mailed without your approval.</CardDescription></CardHeader><CardContent className="grid gap-4 text-sm sm:grid-cols-2"><Info label="Audience" value={`${campaign.sicCodes.join(", ") || "Custom"} · ${campaign.cities?.join(", ") || campaign.city || "All UK"}`} /><Info label="Company age" value={`New within ${campaign.companyAgeDays ?? 30} days`} /><Info label="Last checked" value={campaign.lastScanCompletedAt ? new Date(campaign.lastScanCompletedAt).toLocaleString("en-GB") : "Not checked yet"} /><Info label="Last result" value={campaign.lastScanError ? `Failed: ${campaign.lastScanError}` : `${campaign.lastScanLeads ?? 0} companies found`} /><Info label="Limits" value={`${campaign.dailySendLimit ?? 20}/day · ${campaign.monthlySendLimit ?? 400}/month`} />{detail.analytics.qrEnabled ? <Info label="QR response" value={`${detail.analytics.totalQrScans} scans · ${detail.analytics.companiesScanned} companies`} /> : <Info label="QR response" value="Not enabled for this campaign version" />}</CardContent></Card>
        <Card><CardHeader><CardTitle>Campaign letter</CardTitle><CardDescription>This exact version was frozen when the campaign was activated.</CardDescription></CardHeader><CardContent>{detail.template && sender ? <div className="grid gap-4 sm:grid-cols-[220px_1fr]"><ScaledLetterPreview subject={detail.template.subject} bodyHtml={detail.template.bodyHtml} ctaText={detail.template.ctaText} ctaUrl={detail.template.ctaUrl} signature={detail.template.signature} sender={sender} serviceFocus={detail.template.serviceFocus} layout={detail.template.layout} /><div><p className="font-black">{detail.template.name}</p><p className="mt-1 text-sm capitalize text-muted-foreground">{detail.template.layout?.design?.preset ?? "minimal"} design · Campaign snapshot</p>{detail.templateStatus.snapshotCreatedAt ? <p className="mt-1 text-xs text-muted-foreground">Frozen {new Date(detail.templateStatus.snapshotCreatedAt).toLocaleString("en-GB")}</p> : null}{!detail.analytics.qrEnabled ? <div className="mt-3 border-2 border-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3))]/15 p-3 text-sm font-bold">This campaign version has no tracked QR code. Create a new version before preparing QR-enabled letters.</div> : <div className="mt-3 border-2 bg-muted p-3 text-sm font-bold">Tracked QR is included in this campaign version.</div>}{detail.templateStatus.newerVersionAvailable ? <div className="mt-3 border-2 bg-[hsl(var(--chart-2))]/15 p-3 text-sm font-bold">A newer source template is available. Existing batches keep this frozen version.</div> : null}<Button asChild className="mt-3" variant="outline"><Link href={`/app/templates/${detail.template.sourceTemplateId ?? detail.template.id}?returnTo=/app/campaigns/${campaign.id}`}>Create new version <ExternalLink className="ml-2 size-4" /></Link></Button></div></div> : <p className="text-sm text-destructive">The exact saved campaign letter could not be rendered. Do not prepare or approve mail until sender setup and the snapshot are available.</p>}</CardContent></Card>
      </section>

      <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Matches</CardTitle><CardDescription>Select up to 20 eligible companies and prepare one approval batch.</CardDescription></div><Badge variant="outline">{detail.leads.length} total</Badge></div></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">{(["eligible", "in_batch", "sent", "suppressed"] as Filter[]).map((value) => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => { setFilter(value); setSelected([]); setVisibleCount(20) }} className="capitalize">{value.replace("_", " ")} · {detail.leads.filter((lead) => lead.eligibility === value).length}</Button>)}</div>
        <label className="relative block"><span className="sr-only">Search campaign matches</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={leadSearch} onChange={(event) => { setLeadSearch(event.target.value); setVisibleCount(20) }} className="pl-9" placeholder="Search by company, number, location or SIC…" /></label>
        {shown.length ? <><div className="divide-y-2 border-2">{visibleLeads.map((lead) => { const checked = selected.includes(lead.id); return <label key={lead.id} className={`grid gap-3 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center ${filter === "eligible" ? "cursor-pointer" : "opacity-70"}`}><input type="checkbox" className="size-5" checked={checked} disabled={filter !== "eligible" || (!checked && selected.length >= 20)} onChange={() => toggleLead(lead.id)} /><div><p className="font-black">{lead.company.companyName}</p><p className="text-sm text-muted-foreground">{lead.company.companyNumber} · {lead.company.incorporationDate} · {lead.company.location}</p><p className="mt-1 text-xs">{lead.matchReasons.join(" · ")}</p></div><Badge variant="outline" className="capitalize">{lead.eligibility.replace("_", " ")}</Badge></label>})}</div>{visibleCount < shown.length ? <Button type="button" variant="outline" className="w-full" onClick={() => setVisibleCount((count) => count + 20)}>Load 20 more · {shown.length - visibleCount} remaining</Button> : null}</> : <p className="border-2 border-dashed p-5 text-sm text-muted-foreground">No companies in this view.</p>}
        {filter === "eligible" ? <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 border-2 bg-background p-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]"><div><p className="font-black">{selected.length} selected</p><p className="text-sm text-muted-foreground">{selected.length} credits required · maximum 20 letters</p>{!approvalSafe ? <p className="mt-1 text-xs font-bold text-destructive">Campaign snapshot or sender setup is unavailable.</p> : null}</div><Button disabled={!owner || !approvalSafe || selected.length === 0 || busy === "batch"} onClick={prepareBatch}>{busy === "batch" ? "Preparing…" : `Prepare ${selected.length} ${selected.length === 1 ? "letter" : "letters"}`} <Check className="ml-2 size-4" /></Button></div> : null}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Ready for approval</CardTitle><CardDescription>Generate and open the exact Company Radar PDF before approving any physical mail. A changed letter requires a new preview.</CardDescription></CardHeader><CardContent>{pendingBatches.length ? <div className="space-y-3">{pendingBatches.map((batch) => { const count = detail.mailItems.filter((item) => item.batchId === batch.id).length; return <div key={batch.id} className="flex flex-wrap items-center justify-between gap-3 border-2 p-3"><div><p className="font-black">{batch.name}</p><p className="text-sm text-muted-foreground">{count} {count === 1 ? "recipient" : "recipients"} · {count} {count === 1 ? "credit" : "credits"} · A4 single-sided · Second Class</p></div>{owner ? <div className="flex gap-2"><Button variant="outline" disabled={!approvalSafe || busy !== null} onClick={() => preview(batch.id)}>Open exact PDF</Button><Button disabled={!approvalSafe || busy !== null} onClick={() => approve(batch.id)}>Approve & send</Button></div> : null}</div>})}</div> : <p className="border-2 border-dashed p-5 text-sm text-muted-foreground">Select eligible matches to prepare an approval batch.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle>Test sends</CardTitle><CardDescription>Private delivery tests created from this campaign letter. Test sends do not affect match or QR campaign analytics.</CardDescription></CardHeader><CardContent>{testBatches.length ? <div className="space-y-3">{testBatches.map((batch) => { const item = detail.mailItems.find((candidate) => candidate.batchId === batch.id); if (!item) return null; const address = item.manualRecipient?.address; return <div key={batch.id} className="grid gap-3 border-2 p-3 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.companyName}</p><Badge variant="outline">{deliveryLabel(item)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{address ? [address.address1, address.address2, address.town, address.postcode].filter(Boolean).join(", ") : "Manual test recipient"}</p><p className="mt-1 text-xs">1 letter · 1 credit · A4 single-sided · Second Class</p>{item.lastError ? <p className="mt-2 text-xs text-destructive">{item.lastError}</p> : null}</div>{owner && item.status === "pending_approval" ? <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy !== null} onClick={() => window.open(`/api/app/mail/preview/${item.id}`, "_blank", "noopener,noreferrer")}>Open PDF preview</Button><Button disabled={busy !== null} onClick={() => approve(batch.id)}>Approve & send</Button></div> : null}</div>})}</div> : <p className="border-2 border-dashed p-5 text-sm text-muted-foreground">No test letters yet.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle>Activity</CardTitle><CardDescription>Campaign and test letters in one timeline: printing, dispatch, failures, refunds and QR response.</CardDescription></CardHeader><CardContent>{history.length ? <div className="divide-y-2 border-2">{history.map((item) => <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto]"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{item.companyName}</p>{item.manualRecipient ? <Badge variant="outline">Test</Badge> : null}</div><p className="text-xs text-muted-foreground">{item.manualRecipient ? "Manual test recipient" : item.companyNumber} · {deliveryLabel(item)}</p>{item.lastError ? <p className="mt-1 text-xs text-destructive">{item.lastError}</p> : null}</div><Badge variant="outline" className="capitalize">{deliveryLabel(item)}</Badge>{detail.analytics.qrEnabled && !item.manualRecipient ? <span className="text-sm">{item.qrScanCount ?? 0} QR scans</span> : <span className="text-sm text-muted-foreground">{item.manualRecipient ? "Test send" : "No tracked QR"}</span>}</div>)}</div> : <p className="border-2 border-dashed p-5 text-sm text-muted-foreground">Scheduled, dispatched and failed letters will appear here.</p>}</CardContent></Card>

      {owner ? <Card className="border-destructive"><CardHeader><CardTitle>Delete campaign</CardTitle><CardDescription>Remove this campaign from your dashboard and stop future scans. Existing delivery and credit records are preserved.</CardDescription></CardHeader><CardContent><Button variant="destructive" disabled={busy !== null} onClick={deleteCampaign}><Trash2 className="mr-2 size-4" />{busy === "delete" ? "Deleting…" : "Delete campaign"}</Button></CardContent></Card> : null}
    </div>
  </main>
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="font-bold">{label}</p><p className="text-muted-foreground">{value}</p></div> }
function Field({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) { return <label className={`text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}<Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} /></label> }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) }
function deliveryLabel(item: Detail["mailItems"][number]) { if (item.submissionUnknownAt) return "Needs review"; return item.providerStatus ?? ({ pending_approval: item.previewOpenedAt ? "Preview opened" : "Preview ready", submitted: "Scheduled", production: "In production", dispatched: "Dispatched", failed: "Failed / credit refunded", blocked: "Needs review" } as Record<string, string>)[item.status] ?? item.status.replaceAll("_", " ") }
