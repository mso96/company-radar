import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripe(secretKey: string) {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { timeout: 15000, maxNetworkRetries: 0 })
  }

  return stripeClient
}
