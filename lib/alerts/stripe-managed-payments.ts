import { ALERT_PLAN_INTERVAL, ALERT_PLAN_PRICE_GBP } from "@/lib/alerts/constants"

const STRIPE_MANAGED_PAYMENTS_VERSION = "2026-02-25.preview"
const STRIPE_TAX_CODE = "txcd_10103100"
const PRICE_AMOUNT_PENCE = 499
const PRICE_CURRENCY = "gbp"

interface StripeApiProductResponse {
  id: string
  default_price?: string | { id?: string } | null
}

interface StripeApiCheckoutSessionResponse {
  id: string
  url?: string | null
}

export async function ensureManagedSubscriptionPrice(
  db: D1Database,
  stripeSecretKey: string,
  existingPriceId?: string
) {
  if (existingPriceId) {
    return existingPriceId
  }

  const storedPriceId = await getAppConfigValue(db, "managed_subscription_price_id")
  if (storedPriceId) {
    return storedPriceId
  }

  const product = await postStripeForm<StripeApiProductResponse>(
    stripeSecretKey,
    "/v1/products",
    [
      ["name", "UK Company Radar SIC Alerts"],
      [
        "description",
        `Weekly ${ALERT_PLAN_PRICE_GBP}/${ALERT_PLAN_INTERVAL} SIC-based UK company alerts`,
      ],
      ["tax_code", STRIPE_TAX_CODE],
      ["metadata[product_key]", "uk_company_radar_paid_sic_alerts"],
      ["default_price_data[unit_amount]", String(PRICE_AMOUNT_PENCE)],
      ["default_price_data[currency]", PRICE_CURRENCY],
      ["default_price_data[recurring][interval]", ALERT_PLAN_INTERVAL],
    ]
  )

  const defaultPriceId =
    typeof product.default_price === "string"
      ? product.default_price
      : product.default_price?.id

  if (!defaultPriceId) {
    throw new Error("Stripe did not return a default price for the managed subscription product.")
  }

  await setAppConfigValues(db, {
    managed_subscription_product_id: product.id,
    managed_subscription_price_id: defaultPriceId,
  })

  return defaultPriceId
}

export async function createManagedCheckoutSession({
  stripeSecretKey,
  priceId,
  origin,
  email,
  sicCodes,
}: {
  stripeSecretKey: string
  priceId: string
  origin: string
  email: string
  sicCodes: string[]
}) {
  const session = await postStripeForm<StripeApiCheckoutSessionResponse>(
    stripeSecretKey,
    "/v1/checkout/sessions",
    [
      ["mode", "subscription"],
      ["managed_payments[enabled]", "true"],
      ["success_url", `${origin}/alerts/success?session_id={CHECKOUT_SESSION_ID}`],
      ["cancel_url", `${origin}/?alerts=cancelled`],
      ["customer_email", email],
      ["line_items[0][price]", priceId],
      ["line_items[0][quantity]", "1"],
      ["allow_promotion_codes", "true"],
      ["billing_address_collection", "auto"],
      ["metadata[email]", email],
      ["metadata[sic_codes]", sicCodes.join(",")],
      ["subscription_data[metadata][email]", email],
      ["subscription_data[metadata][sic_codes]", sicCodes.join(",")],
    ]
  )

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.")
  }

  return session.url
}

async function postStripeForm<T>(
  stripeSecretKey: string,
  path: string,
  entries: Array<[string, string]>
) {
  const body = new URLSearchParams(entries)
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_MANAGED_PAYMENTS_VERSION,
    },
    body,
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Stripe API request failed with status ${response.status}: ${errorText}`)
  }

  return (await response.json()) as T
}

async function getAppConfigValue(db: D1Database, key: string) {
  const result = await db
    .prepare(`SELECT value FROM app_config WHERE key = ?1`)
    .bind(key)
    .first<{ value: string }>()

  return result?.value ?? null
}

async function setAppConfigValues(db: D1Database, values: Record<string, string>) {
  const now = new Date().toISOString()
  const statements = Object.entries(values).map(([key, value]) =>
    db
      .prepare(
        `INSERT INTO app_config (key, value, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`
      )
      .bind(key, value, now)
  )

  await db.batch(statements)
}
