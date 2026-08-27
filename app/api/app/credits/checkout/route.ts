import { NextResponse } from "next/server"
import { getCreditPacks } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"
import { createAgencyCheckoutSession } from "@/lib/stripe"
import { CUSTOM_CREDIT_PRICE_PENCE } from "@/lib/agency/pricing"

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const { packId, credits: requestedCredits } = await request.json() as { packId?: string; credits?: number }
    const pack = packId ? (await getCreditPacks(db)).find((item) => item.id === packId) : undefined
    if (packId && !pack) throw new Error("This credit pack is not available.")
    if (!pack && (!Number.isInteger(requestedCredits) || requestedCredits! < 25 || requestedCredits! > 5000)) {
      throw new Error("Custom credit purchases must be between 25 and 5,000 credits.")
    }
    const credits = pack?.credits ?? requestedCredits!
    const pricePence = pack?.pricePence ?? credits * CUSTOM_CREDIT_PRICE_PENCE
    const env = await getAgencyRuntimeEnv(); const origin = new URL(request.url).origin
    const url = await createAgencyCheckoutSession({ secretKey: requireAgencyEnvValue(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"), origin, email: session.email, workspaceId: session.workspaceId, credits, packId: pack?.id ?? "custom", stripePriceId: pack?.stripePriceId, pricePence })
    return NextResponse.json({ url })
  } catch (error) { return agencyError(error) }
}
