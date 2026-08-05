import { NextResponse } from "next/server"
import { getCreditPacks } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"
import { getStripe } from "@/lib/stripe"

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
    const pricePence = pack?.pricePence ?? credits * 150
    const env = await getAgencyRuntimeEnv(); const stripe = getStripe(requireAgencyEnvValue(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY")); const origin = new URL(request.url).origin
    const lineItem = pack?.stripePriceId ? { price: pack.stripePriceId, quantity: 1 } : { price_data: { currency: "gbp", unit_amount: pricePence, tax_behavior: "exclusive" as const, product_data: { name: `${credits} UK Company Radar mail credits`, description: "One credit covers one standard single-sided letter." } }, quantity: 1 }
    const checkout = await stripe.checkout.sessions.create({ mode: "payment", line_items: [lineItem], customer_email: session.email, client_reference_id: session.workspaceId, automatic_tax: { enabled: true }, metadata: { kind: "agency_credit", workspace_id: session.workspaceId, pack_id: pack?.id ?? "custom", credits: String(credits) }, success_url: `${origin}/app?credits=success`, cancel_url: `${origin}/app?credits=cancelled` })
    if (!checkout.url) throw new Error("Stripe did not return a checkout URL.")
    return NextResponse.json({ url: checkout.url })
  } catch (error) { return agencyError(error) }
}
