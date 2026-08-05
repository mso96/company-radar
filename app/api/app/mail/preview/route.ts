import { NextResponse } from "next/server"
import { FrankkClient } from "@/lib/agency/frankk"
import { prepareFrankkCampaign } from "@/lib/agency/frankk-dispatch"
import { getSenderProfile, listPendingMailItems } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const { batchId } = await request.json() as { batchId?: string }
    if (!batchId) throw new Error("Choose a mail batch.")
    const sender = await getSenderProfile(db, session.workspaceId)
    if (!sender) throw new Error("Complete the sender profile before previewing mail.")
    const [item] = await listPendingMailItems(db, session.workspaceId, batchId)
    if (!item) throw new Error("This batch has no pending letters.")
    const env = await getAgencyRuntimeEnv()
    const prepared = await prepareFrankkCampaign({ db, env, client: new FrankkClient(requireAgencyEnvValue(env.FRANKK_API_KEY, "FRANKK_API_KEY")), workspaceId: session.workspaceId, itemId: item.id, sender, storePreview: true })
    return NextResponse.json({ itemId: item.id, campaignId: prepared.campaignId, previewUrl: `/api/app/mail/preview/${item.id}`, recipient: prepared.row.company_name, status: "preview_ready" })
  } catch (error) { return agencyError(error) }
}
