import type { CompanyRecord } from "@/lib/types"

export type WorkspaceRole = "owner" | "member"
export type WatchRelationship = "competitor" | "client"
export type AgencyEventType =
  | "company.incorporated"
  | "company.filing.changed"
  | "company.officer.changed"
  | "company.psc.changed"
  | "company.charge.created"
  | "company.status.changed"

export interface AgencySession {
  userId: string
  email: string
  workspaceId: string
  workspaceName: string
  role: WorkspaceRole
}

export interface AgencyRadar {
  id: string
  workspaceId: string
  name: string
  city: string | null
  region: string | null
  cities?: string[]
  segmentSlugs?: string[]
  serviceFocus?: string[]
  keywords: string[]
  companyTypes: string[]
  eventTypes: AgencyEventType[]
  sicCodes: string[]
  deliveryFrequency: "daily" | "weekly"
  isActive: boolean
  autoQueueLetters?: boolean
  mailTemplateId?: string | null
  segmentSlug?: string | null
  companyAgeDays?: number | null
  companyStatuses?: string[]
  postcodePrefixes?: string[]
  dailySendLimit?: number
  monthlySendLimit?: number
  approvalRequired?: boolean
  activatedAt?: string | null
  pausedAt?: string | null
  createdAt: string
}

export interface AgencySegment {
  slug: string
  name: string
  description: string
  persona: string
  sicCodes: string[]
  defaultFilters: { companyAgeDays?: number; city?: string; region?: string; keywords?: string[] }
  defaultTemplateId?: string | null
  pricePence: number
  currency: string
  featuredRank?: number | null
  isActive: boolean
}

export interface AgencyTemplateLibraryItem {
  id: string
  segmentSlug: string
  name: string
  description: string
  subject: string
  bodyHtml: string
  ctaText?: string
  ctaUrl?: string
  signature: string
  mergeFields: string[]
  pricePence: number
  currency: string
  version: string
  serviceFocus?: string[]
}

export interface AgencyLead {
  id: string
  workspaceId: string
  radarId: string
  company: CompanyRecord
  matchReasons: string[]
  score: number
  createdAt: string
  radarName?: string
}

export interface AgencyEvent {
  id: string
  companyNumber: string
  companyName: string
  eventType: AgencyEventType
  eventAt: string
  relationshipType: WatchRelationship | null
  sourceRecord: Record<string, unknown>
  createdAt: string
}

export interface WatchlistCompany {
  id: string
  companyNumber: string
  companyName: string | null
  relationshipType: WatchRelationship
  updatedAt: string
}

export interface WebhookEndpoint {
  id: string
  radarId: string
  url: string
  isActive: boolean
  secret?: string
  createdAt: string
}

export interface CreateRadarInput {
  name: string
  sicCodes: string[]
  city?: string
  cities?: string[]
  region?: string
  keywords?: string[]
  companyTypes?: string[]
  eventTypes?: AgencyEventType[]
  deliveryFrequency?: "daily" | "weekly"
  autoQueueLetters?: boolean
  mailTemplateId?: string
  segmentSlug?: string
  segmentSlugs?: string[]
  serviceFocus?: string[]
  companyAgeDays?: number
  companyStatuses?: string[]
  postcodePrefixes?: string[]
  dailySendLimit?: number
  monthlySendLimit?: number
  approvalRequired?: boolean
}

export interface SenderProfile { agencyName: string; address: PostalAddress; replyEmail: string; website?: string; optOutText: string; logoUrl?: string; accentColor?: string }
export interface PostalAddress { address1: string; address2?: string; town: string; county?: string; postcode: string; country: string }
export interface LetterTemplate { id: string; workspaceId: string; name: string; subject: string; bodyHtml: string; ctaText?: string; ctaUrl?: string; signature: string; isDefault: boolean; createdAt: string; sourceTemplateId?: string | null; segmentSlug?: string | null; templateVersion?: string; isPlatformTemplate?: boolean; pricingVersion?: string; pricePence?: number; currency?: string; serviceFocus?: string[] }
export interface CreditPack { id: string; name: string; credits: number; pricePence: number; stripePriceId?: string; active: boolean }
export interface MailBatch { id: string; name: string; templateId: string; status: string; creditReserved: number; createdAt: string }
export interface MailItem { id: string; batchId: string; companyNumber: string; companyName: string; status: string; providerStatus?: string | null; providerPdfUrl?: string | null; lastError?: string | null; createdAt: string; customerPricePence?: number | null; currency?: string; marginPence?: number | null }
