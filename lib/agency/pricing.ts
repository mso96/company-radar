import type { CreditPack } from "@/lib/agency/types"

export const CUSTOM_CREDIT_PRICE_PENCE = 250
export const WELCOME_CREDITS = 5

export const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  { id: "credits-25", name: "Starter", credits: 25, pricePence: 5900, active: true },
  { id: "credits-100", name: "Growth", credits: 100, pricePence: 21900, active: true },
  { id: "credits-500", name: "Scale", credits: 500, pricePence: 99900, active: true },
]

export function formatUnitPrice(pricePence: number, credits: number) {
  return `£${(pricePence / credits / 100).toFixed(2)}`
}
