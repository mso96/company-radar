import { getStripe } from "@/lib/stripe"
import type { AlertsRuntimeEnv } from "@/lib/alerts/runtime"

/** Stops legacy SIC-alert renewals while preserving historic rows and access records. */
export async function sunsetLegacyAlertSubscriptions(env: AlertsRuntimeEnv) {
  if (!env.ALERTS_DB || !env.STRIPE_SECRET_KEY) return { cancelled: 0 }
  const rows = await env.ALERTS_DB.prepare(`SELECT id, email, stripe_subscription_id FROM alert_subscriptions WHERE status IN ('active', 'trialing') LIMIT 100`).all<{ id: string; email: string; stripe_subscription_id: string }>()
  const stripe = getStripe(env.STRIPE_SECRET_KEY); let cancelled = 0
  for (const row of rows.results ?? []) {
    await stripe.subscriptions.update(row.stripe_subscription_id, { cancel_at_period_end: true })
    await env.ALERTS_DB.prepare(`UPDATE alert_subscriptions SET status = 'sunset_pending', updated_at = ?1 WHERE id = ?2`).bind(new Date().toISOString(), row.id).run()
    if (env.RESEND_API_KEY && env.ALERT_FROM_EMAIL) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.ALERT_FROM_EMAIL, to: [row.email], subject: "Your SIC Alerts subscription will not renew", html: "<p>SIC Alerts is moving to Agency Direct Mail. Your existing subscription has been set to end at the close of its current billing period and will not renew.</p>" }) })
    cancelled += 1
  }
  return { cancelled }
}
