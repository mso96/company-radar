import { NextResponse } from "next/server"
import { getCreditPacks } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"
import { getStripe } from "@/lib/stripe"

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const { packId } = await request.json() as { packId: string }
    const pack = (await getCreditPacks(db)).find((item) => item.id === packId)
    if (!pack?.stripePriceId) throw new Error("This credit pack is not configured for checkout yet.")
    const env = await getAgencyRuntimeEnv(); const stripe = getStripe(requireAgencyEnvValue(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY")); const origin = new URL(request.url).origin
    const checkout = await stripe.checkout.sessions.create({ mode: "payment", line_items: [{ price: pack.stripePriceId, quantity: 1 }], customer_email: session.email, metadata: { kind: "agency_credit", workspace_id: session.workspaceId, pack_id: pack.id, credits: String(pack.credits) }, success_url: `${origin}/app?credits=success`, cancel_url: `${origin}/app?credits=cancelled` })
    if (!checkout.url) throw new Error("Stripe did not return a checkout URL.")
    return NextResponse.json({ url: checkout.url })
  } catch (error) { return agencyError(error) }
}
