import { NextResponse } from "next/server"
import { createMagicLink } from "@/lib/agency/db"
import { sendMagicLinkEmail } from "@/lib/agency/email"
import { getAgencyRuntimeEnv, requireAgencyDatabase, requireAgencyEnvValue } from "@/lib/agency/runtime"

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string }
    const normalized = email?.trim().toLowerCase()
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Enter a valid email address.")
    const env = await getAgencyRuntimeEnv(); const db = requireAgencyDatabase(env)
    const token = await createMagicLink(db, normalized)
    const siteUrl = (env.SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "")
    await sendMagicLinkEmail({ resendApiKey: requireAgencyEnvValue(env.RESEND_API_KEY, "RESEND_API_KEY"), from: requireAgencyEnvValue(env.ALERT_FROM_EMAIL, "ALERT_FROM_EMAIL"), to: normalized, url: `${siteUrl}/api/auth/verify?token=${encodeURIComponent(token)}` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send sign-in link."
    const safeMessage = message.includes("ALERTS_DB")
      ? "Local agency workspace is not configured. Apply the D1 migrations and add the ALERTS_DB binding."
      : message.includes("RESEND_API_KEY") || message.includes("ALERT_FROM_EMAIL")
        ? "Email sign-in is not configured in this environment. Use the local demo or add the Resend settings."
        : message
    return NextResponse.json({ error: safeMessage }, { status: 400 })
  }
}
