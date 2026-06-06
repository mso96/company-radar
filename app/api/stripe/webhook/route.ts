import Stripe from "stripe"
import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { upsertAlertSubscription, updateAlertSubscriptionStatus } from "@/lib/alerts/db"
import { sendWelcomeAlertEmail } from "@/lib/alerts/email"
import {
  getAlertsRuntimeEnv,
  requireAlertsDatabase,
  requireEnvValue,
} from "@/lib/alerts/runtime"

export async function POST(request: Request) {
  const payload = await request.text()

  try {
    const env = await getAlertsRuntimeEnv()
    const stripeSecretKey = requireEnvValue(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY")
    const webhookSecret = requireEnvValue(
      env.STRIPE_WEBHOOK_SECRET,
      "STRIPE_WEBHOOK_SECRET"
    )
    const db = requireAlertsDatabase(env)
    const resendApiKey = requireEnvValue(env.RESEND_API_KEY, "RESEND_API_KEY")
    const from = requireEnvValue(env.ALERT_FROM_EMAIL, "ALERT_FROM_EMAIL")
    const stripe = getStripe(stripeSecretKey)
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      throw new Error("Missing Stripe signature header.")
    }

    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret
    )

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") {
          break
        }

        const email =
          session.customer_details?.email ??
          session.customer_email ??
          session.metadata?.email
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id
        const sicCodes = (session.metadata?.sic_codes ?? "")
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean)

        if (!email || !stripeCustomerId || !stripeSubscriptionId || sicCodes.length === 0) {
          throw new Error("Stripe checkout session did not include the alert metadata.")
        }

        await upsertAlertSubscription(db, {
          email,
          stripeCustomerId,
          stripeSubscriptionId,
          status: "active",
          sicCodes,
        })

        await sendWelcomeAlertEmail({
          resendApiKey,
          from,
          to: email,
          trackedSicCodes: sicCodes,
          idempotencyKey: `welcome:${stripeSubscriptionId}`,
        })

        break
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await updateAlertSubscriptionStatus(db, subscription.id, subscription.status)
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe webhook processing failed.",
      },
      { status: 400 }
    )
  }
}
