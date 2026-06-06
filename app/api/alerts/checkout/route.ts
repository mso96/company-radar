import { NextResponse } from "next/server"
import { validateAlertCheckoutInput } from "@/lib/alerts/validation"
import {
  getAlertsRuntimeEnv,
  requireAlertsDatabase,
  requireEnvValue,
} from "@/lib/alerts/runtime"
import {
  createManagedCheckoutSession,
  ensureManagedSubscriptionPrice,
} from "@/lib/alerts/stripe-managed-payments"
import type { AlertCheckoutInput } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AlertCheckoutInput
    const { email, sicCodes } = validateAlertCheckoutInput(payload)
    const env = await getAlertsRuntimeEnv()
    const stripeSecretKey = requireEnvValue(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY")
    const db = requireAlertsDatabase(env)
    const origin = new URL(request.url).origin

    const stripePriceId = await ensureManagedSubscriptionPrice(
      db,
      stripeSecretKey,
      env.STRIPE_PRICE_ID
    )
    const url = await createManagedCheckoutSession({
      stripeSecretKey,
      priceId: stripePriceId,
      origin,
      email,
      sicCodes,
    })

    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start the paid SIC alert checkout.",
      },
      { status: 400 }
    )
  }
}
