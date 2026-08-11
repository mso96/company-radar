import { NextResponse } from "next/server"
import { getCampaignDetail } from "@/lib/agency/campaigns"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { db, session } = await getAgencyRequestContext()
    const detail = await getCampaignDetail(db, session.workspaceId, (await context.params).campaignId)
    if (!detail) return NextResponse.json({ error: "Campaign not found." }, { status: 404 })
    return NextResponse.json(detail)
  } catch (error) { return agencyError(error) }
}
