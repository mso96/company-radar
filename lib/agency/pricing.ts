import type { CreditPack } from "@/lib/agency/types"

export const CUSTOM_CREDIT_PRICE_PENCE = 150
export const WELCOME_CREDITS = 1

export const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  { id: "credits-25", name: "Starter", credits: 25, pricePence: 3750, stripePriceId: "price_1U9147CQ5kTlNRIVytjjiHh5", active: true },
  { id: "credits-100", name: "Growth", credits: 100, pricePence: 15000, stripePriceId: "price_1U9132CQ5kTlNRIVmFtnMoxA", active: true },
  { id: "credits-500", name: "Scale", credits: 500, pricePence: 75000, stripePriceId: "price_1U914YCQ5kTlNRIVdTxQRgm6", active: true },
]

export function formatUnitPrice(pricePence: number, credits: number) {
  return `£${(pricePence / credits / 100).toFixed(2)}`
}
