import { NextResponse } from "next/server"
import { FrankkClient, FrankkError, type FrankkCost } from "@/lib/agency/frankk"
import { prepareFrankkCampaign } from "@/lib/agency/frankk-dispatch"
import { completeMailBatch, getCreditBalance, getSenderProfile, listPendingMailItems, refundCredit, reserveCredits, updateFrankkMailItem } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

const MAX_NET_COST_PENCE = 150

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const { batchId } = await request.json() as { batchId?: string }
    if (!batchId) throw new Error("Choose a mail batch.")
    const sender = await getSenderProfile(db, session.workspaceId)
    if (!sender) throw new Error("Complete the sender profile before mailing.")
    const items = await listPendingMailItems(db, session.workspaceId, batchId)
    if (!items.length) throw new Error("This batch has no pending letters.")
    if (!items[0].previewed_at) throw new Error("Open the real Frankk PDF preview before approving this batch.")
    const customerBalance = await getCreditBalance(db, session.workspaceId)
    if (customerBalance < items.length) throw new Error(`Insufficient credits. You need ${items.length} credits and have ${customerBalance}.`)
    const env = await getAgencyRuntimeEnv(); const client = new FrankkClient(requireAgencyEnvValue(env.FRANKK_API_KEY, "FRANKK_API_KEY"))

    const campaigns: Array<{ itemId: string; campaignId: string }> = []
    for (const item of items) {
      const campaign = await prepareFrankkCampaign({ db, env, client, workspaceId: session.workspaceId, itemId: item.id, sender, storePreview: false })
      await client.campaignDetails(campaign.campaignId)
      campaigns.push({ itemId: item.id, campaignId: campaign.campaignId })
    }
    const date = await client.availableDates()
    const prepared: Array<{ itemId: string; campaignId: string; cost: FrankkCost; date: string }> = []
    for (const campaign of campaigns) {
      await client.approve(campaign.campaignId)
      const cost = await client.cost(campaign.campaignId)
      if (cost.currency !== "GBP") throw new Error(`Frankk returned ${cost.currency}; only GBP campaigns can be scheduled.`)
      if (cost.costPerRecipientPence > MAX_NET_COST_PENCE) throw new Error(`Frankk cost is £${(cost.costPerRecipientPence / 100).toFixed(2)} per recipient, above the £1.50 safety limit.`)
      await updateFrankkMailItem(db, session.workspaceId, campaign.itemId, { status: "pending_approval", quotedCostPence: cost.costPerRecipientPence, totalCostPence: cost.totalPence, currency: cost.currency, providerStatus: "Approved" })
      prepared.push({ itemId: campaign.itemId, campaignId: campaign.campaignId, cost, date })
    }
    const requiredBalance = prepared.reduce((sum, item) => sum + item.cost.totalPence, 0)
    const providerBalance = await client.balancePence()
    if (providerBalance < requiredBalance) throw new Error("The print provider balance is temporarily too low. Customer credits were not changed.")
    await reserveCredits(db, session.workspaceId, batchId, items.length)

    const results: Array<{ itemId: string; status: string; dispatchDate?: string; error?: string }> = []
    for (const item of prepared) {
      try {
        const scheduled = await client.schedule(item.campaignId, item.date)
        await updateFrankkMailItem(db, session.workspaceId, item.itemId, { status: "submitted", orderId: scheduled.orderId, providerStatus: "Scheduled", quotedCostPence: item.cost.costPerRecipientPence, totalCostPence: item.cost.totalPence, currency: item.cost.currency, scheduled: true })
        results.push({ itemId: item.itemId, status: "scheduled", dispatchDate: item.date })
      } catch (error) {
        const unknown = error instanceof FrankkError && error.submissionUnknown
        await updateFrankkMailItem(db, session.workspaceId, item.itemId, { status: unknown ? "blocked" : "failed", providerStatus: unknown ? "submission_unknown" : "Failed", error: error instanceof Error ? error.message : "Frankk submission failed.", submissionUnknown: unknown })
        if (!unknown) await refundCredit(db, session.workspaceId, item.itemId)
        results.push({ itemId: item.itemId, status: unknown ? "submission_unknown" : "failed", error: error instanceof Error ? error.message : "Frankk submission failed." })
      }
    }
    await completeMailBatch(db, session.workspaceId, batchId, results.some((item) => item.status === "scheduled") ? "completed" : "failed")
    return NextResponse.json({ results })
  } catch (error) { return agencyError(error) }
}
