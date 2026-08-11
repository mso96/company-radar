import { NextResponse } from "next/server"
import { createMailBatchFromLeads } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const campaignId = (await context.params).campaignId
    const payload = await request.json() as { leadIds?: string[]; name?: string }
    const campaign = await db.prepare(`SELECT mail_template_id FROM agency_radars WHERE id=?1 AND workspace_id=?2`).bind(campaignId, session.workspaceId).first<{ mail_template_id: string | null }>()
    if (!campaign?.mail_template_id) throw new Error("This campaign has no saved letter snapshot.")
    const id = await createMailBatchFromLeads(db, { workspaceId: session.workspaceId, userId: session.userId, templateId: campaign.mail_template_id, radarId: campaignId, leadIds: payload.leadIds ?? [], name: payload.name })
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) { return agencyError(error) }
}
