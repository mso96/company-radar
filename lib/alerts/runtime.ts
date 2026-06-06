import { getCloudflareContext } from "@opennextjs/cloudflare"

export interface AlertsRuntimeEnv {
  ALERTS_DB?: D1Database
  COMPANIES_HOUSE_API_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_ID?: string
  RESEND_API_KEY?: string
  ALERT_FROM_EMAIL?: string
}

export async function getAlertsRuntimeEnv() {
  const context = await getCloudflareContext({ async: true })
  return {
    ...context.env,
    COMPANIES_HOUSE_API_KEY:
      context.env.COMPANIES_HOUSE_API_KEY ?? process.env.COMPANIES_HOUSE_API_KEY,
    STRIPE_SECRET_KEY: context.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET:
      context.env.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: context.env.STRIPE_PRICE_ID ?? process.env.STRIPE_PRICE_ID,
    RESEND_API_KEY: context.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY,
    ALERT_FROM_EMAIL: context.env.ALERT_FROM_EMAIL ?? process.env.ALERT_FROM_EMAIL,
  } as AlertsRuntimeEnv
}

export function requireAlertsDatabase(env: AlertsRuntimeEnv) {
  if (!env.ALERTS_DB) {
    throw new Error(
      "ALERTS_DB is not configured. Add a Cloudflare D1 binding before using paid SIC alerts."
    )
  }

  return env.ALERTS_DB
}

export function requireEnvValue(
  value: string | undefined,
  key: keyof AlertsRuntimeEnv
) {
  if (!value) {
    throw new Error(`${key} is not configured.`)
  }

  return value
}
