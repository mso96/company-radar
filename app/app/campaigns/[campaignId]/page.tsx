import { notFound, redirect } from "next/navigation"
import { CampaignDetail } from "@/components/agency/campaign-detail"
import { getCurrentAgencySession } from "@/lib/agency/auth"
import { getCampaignDetail } from "@/lib/agency/campaigns"
import { getCreditBalance, getSenderProfile } from "@/lib/agency/mail"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"

export const dynamic = "force-dynamic"

export default async function CampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const session = await getCurrentAgencySession()
  if (!session) redirect("/agency-login")
  const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
  const detail = await getCampaignDetail(db, session.workspaceId, (await params).campaignId)
  if (!detail) notFound()
  const [creditBalance, sender] = await Promise.all([getCreditBalance(db, session.workspaceId), getSenderProfile(db, session.workspaceId)])
  return <CampaignDetail initial={detail} creditBalance={creditBalance} owner={session.role === "owner"} sender={sender} />
}
