import { NextResponse } from "next/server"
import { FrankkClient, FrankkError } from "@/lib/agency/frankk"
import { prepareFrankkCampaign } from "@/lib/agency/frankk-dispatch"
import { createTestMailBatch, getSenderProfile } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"
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
    const client = new FrankkClient(requireAgencyEnvValue(env.FRANKK_API_KEY, "FRANKK_API_KEY"))
    await prepareFrankkCampaign({ db, env, client, workspaceId: session.workspaceId, itemId: created.itemId, sender, storePreview: true })
    const dispatchDate = await client.availableDates()
    return NextResponse.json({ batchId: created.batchId, itemId: created.itemId, previewUrl: `/api/app/mail/preview/${created.itemId}`, recipient: created.recipient, dispatchDate, creditsRequired: 1, status: "preview_ready" }, { status: 201 })
  } catch (error) {
    const message = error instanceof FrankkError ? "The print service could not create the preview. Please try again." : error instanceof Error ? error.message : "Unable to create the test preview."
    return agencyError(new Error(message))
  }
}
