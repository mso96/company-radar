import { NextResponse } from "next/server"
import { createTestMailBatch, getMailItemForDispatch, getSenderProfile, renderLetter, updateFrankkMailItem } from "@/lib/agency/mail"
import { renderA4Pdf, renderHash } from "@/lib/agency/pdf"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv } from "@/lib/agency/runtime"
import type { ManualRecipient } from "@/lib/agency/types"

export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const campaignId = (await context.params).campaignId
    const payload = await request.json() as { recipient?: ManualRecipient }
    if (!payload.recipient) throw new Error("Enter the test recipient and postal address.")
    const campaign = await db.prepare(`SELECT mail_template_id FROM agency_radars WHERE id=?1 AND workspace_id=?2 AND archived_at IS NULL`).bind(campaignId, session.workspaceId).first<{ mail_template_id: string | null }>()
    if (!campaign?.mail_template_id) throw new Error("This campaign does not have a saved letter.")
    const sender = await getSenderProfile(db, session.workspaceId)
    if (!sender) throw new Error("Complete sender setup before creating a test letter.")
    const created = await createTestMailBatch(db, { workspaceId: session.workspaceId, userId: session.userId, campaignId, templateId: campaign.mail_template_id, recipient: payload.recipient })
    const env = await getAgencyRuntimeEnv()
    if (!env.BROWSER) throw new Error("PDF rendering is not configured.")
    if (!env.AGENCY_ASSETS) throw new Error("Private preview storage is not configured.")
    const row = await getMailItemForDispatch(db, session.workspaceId, created.itemId)
    if (!row) throw new Error("The test letter could not be loaded.")
    const html = renderLetter(row, sender, created.recipient.address)
    const hash = await renderHash(html, JSON.stringify(created.recipient.address))
    const pdf = await renderA4Pdf(env.BROWSER, html)
    const previewKey = `mail-previews/${session.workspaceId}/${created.itemId}/${hash}.pdf`
    await env.AGENCY_ASSETS.put(previewKey, pdf, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { workspaceId: session.workspaceId, mailItemId: created.itemId, renderHash: hash } })
    await updateFrankkMailItem(db, session.workspaceId, created.itemId, { status: "pending_approval", address: created.recipient.address, html, renderHash: hash, previewKey, providerStatus: "Preview ready", previewed: true })
    const dispatchDate = nextWorkingDay()
    return NextResponse.json({ batchId: created.batchId, itemId: created.itemId, previewUrl: `/api/app/mail/preview/${created.itemId}`, recipient: created.recipient, dispatchDate, creditsRequired: 1, status: "preview_ready" }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the test preview."
    return agencyError(new Error(message))
  }
}

function nextWorkingDay() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 1)
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
