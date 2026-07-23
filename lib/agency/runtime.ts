import { getCloudflareContext } from "@opennextjs/cloudflare"

export interface AgencyRuntimeEnv {
  ALERTS_DB?: D1Database
  RESEND_API_KEY?: string
  ALERT_FROM_EMAIL?: string
  SITE_URL?: string
  COMPANIES_HOUSE_API_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STANNP_API_KEY?: string
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
  CLERK_SECRET_KEY?: string
}

export async function getAgencyRuntimeEnv(): Promise<AgencyRuntimeEnv> {
  const context = await getCloudflareContext({ async: true })
  return {
    ...context.env,
    RESEND_API_KEY: context.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY,
    ALERT_FROM_EMAIL: context.env.ALERT_FROM_EMAIL ?? process.env.ALERT_FROM_EMAIL,
    SITE_URL: context.env.SITE_URL ?? process.env.SITE_URL,
    COMPANIES_HOUSE_API_KEY:
      context.env.COMPANIES_HOUSE_API_KEY ?? process.env.COMPANIES_HOUSE_API_KEY,
    STRIPE_SECRET_KEY: context.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: context.env.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET,
    STANNP_API_KEY: (context.env as unknown as { STANNP_API_KEY?: string }).STANNP_API_KEY ?? process.env.STANNP_API_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: (context.env as unknown as { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string }).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: (context.env as unknown as { CLERK_SECRET_KEY?: string }).CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY,
  } as AgencyRuntimeEnv
}

export function requireAgencyDatabase(env: AgencyRuntimeEnv) {
  if (!env.ALERTS_DB) {
    throw new Error("ALERTS_DB is not configured. Apply the agency migrations and add the D1 binding.")
  }
  return env.ALERTS_DB
}

export function requireAgencyEnvValue(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}
