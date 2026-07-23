import { SIC_LABELS } from "@/lib/sic-codes"

export interface SectorLandingPageConfig {
  slug: string
  title: string
  description: string
  sector: string
  persona: string
  personaDescription: string
  sicCodes: string[]
  keywords: string[]
}

export const SECTOR_LANDING_PAGES: SectorLandingPageConfig[] = [
  {
    slug: "new-ai-companies",
    title: "New AI companies",
    description: "Find newly incorporated AI and software businesses before they appear in ordinary prospecting lists.",
    sector: "AI & software",
    persona: "Digital agencies",
    personaDescription: "Spot newly formed software and AI companies that need positioning, websites and growth support.",
    sicCodes: ["62012", "62020", "62090"],
    keywords: ["AI", "software", "data", "digital"],
  },
  {
    slug: "new-agencies",
    title: "New digital agencies",
    description: "Track newly incorporated creative, marketing and digital agencies across the UK.",
    sector: "Digital agencies",
    persona: "Digital agencies",
    personaDescription: "Monitor new agencies, competitors and potential collaboration partners as they form.",
    sicCodes: ["73110", "74100", "62012"],
    keywords: ["digital", "creative", "studio", "agency"],
  },
  {
    slug: "new-property-companies",
    title: "New property companies",
    description: "Discover fresh property, estate and development companies for timely commercial outreach.",
    sector: "Property",
    persona: "Property services",
    personaDescription: "Follow new property businesses and receive early signals for services, finance and insurance outreach.",
    sicCodes: ["68100", "68209", "41100"],
    keywords: ["property", "homes", "estate", "development"],
  },
  {
    slug: "new-ecommerce-companies",
    title: "New ecommerce companies",
    description: "Surface newly incorporated ecommerce, retail and online-store businesses across the UK.",
    sector: "Ecommerce",
    persona: "Ecommerce services",
    personaDescription: "Find new merchants early for store builds, fulfilment, paid media and ecommerce operations support.",
    sicCodes: ["47910", "47990", "47190"],
    keywords: ["shop", "store", "commerce", "retail"],
  },
]

export const LEGACY_SECTOR_SLUGS: Record<string, string> = {
  "new-ai-companies-london": "new-ai-companies",
  "new-digital-agencies-london": "new-agencies",
  "new-property-companies-manchester": "new-property-companies",
  "new-ecommerce-companies-birmingham": "new-ecommerce-companies",
}

export function getSectorLandingPage(slug: string) {
  return SECTOR_LANDING_PAGES.find((page) => page.slug === slug) ?? null
}

export function labelsForSicCodes(codes: string[]) {
  return codes.map((code) => `${code} — ${SIC_LABELS[code] ?? "Business activity"}`)
}
