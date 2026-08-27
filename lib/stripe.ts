import Stripe from "stripe"

let stripeClient: Stripe | null = null

interface AgencyCheckoutResponse {
  url?: string | null
}

export function getStripe(secretKey: string) {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { timeout: 15000, maxNetworkRetries: 0 })
  }

  return stripeClient
}

export async function createAgencyCheckoutSession(input: {
  secretKey: string
  origin: string
  email: string
  workspaceId: string
  credits: number
  packId: string
  stripePriceId?: string
  pricePence: number
}) {
  const entries: Array<[string, string]> = [
    ["mode", "payment"],
    ["success_url", `${input.origin}/app?credits=success`],
    ["cancel_url", `${input.origin}/app?credits=cancelled`],
    ["customer_email", input.email],
    ["client_reference_id", input.workspaceId],
    ["automatic_tax[enabled]", "true"],
    ["line_items[0][quantity]", "1"],
    ["metadata[kind]", "agency_credit"],
    ["metadata[workspace_id]", input.workspaceId],
    ["metadata[pack_id]", input.packId],
    ["metadata[credits]", String(input.credits)],
  ]
  if (input.stripePriceId) {
    entries.push(["line_items[0][price]", input.stripePriceId])
  } else {
    entries.push(
      ["line_items[0][price_data][currency]", "gbp"],
      ["line_items[0][price_data][unit_amount]", String(input.pricePence)],
      ["line_items[0][price_data][tax_behavior]", "exclusive"],
      ["line_items[0][price_data][product_data][name]", `${input.credits} UK Company Radar mail credits`],
      ["line_items[0][price_data][product_data][description]", "One credit covers one standard single-sided letter."],
    )
  }
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(entries),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  })
  const payload = await response.json().catch(() => ({})) as AgencyCheckoutResponse & { error?: { message?: string } }
  if (!response.ok) throw new Error(payload.error?.message || "Stripe checkout is currently unavailable. Please try again.")
  if (!payload.url) throw new Error("Stripe did not return a checkout URL.")
  return payload.url
}
