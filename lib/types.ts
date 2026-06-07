export type DateRangeKey = "today" | "yesterday" | "last7" | "last30"

export interface CompanyRecord {
  companyName: string
  companyNumber: string
  incorporationDate: string
  status: string
  type: string
  location: string
  region: string
  sicCodes: string[]
  matchedKeywords: string[]
}

export interface SicOption {
  code: string
  description: string
}

export interface DistributionPoint {
  name: string
  value: number
}

export interface TrendPoint {
  date: string
  registrations: number
}

export interface ActivityPoint {
  code: string
  description: string
  value: number
}

export interface InsightSummary {
  totalCompanies: number
  topCities: DistributionPoint[]
  topRegions: DistributionPoint[]
  topSicCodes: DistributionPoint[]
  topActivities: ActivityPoint[]
  fastestGrowingSectors: DistributionPoint[]
  keywordMatches: DistributionPoint[]
  industryDistribution: DistributionPoint[]
  regionalDistribution: DistributionPoint[]
  companyTypeDistribution: DistributionPoint[]
  registrationTrend: TrendPoint[]
  businessInsights: string[]
}

export interface CompaniesResponse {
  companies: CompanyRecord[]
  insights: InsightSummary
  source: "api" | "demo"
  dateRange: {
    start: string
    end: string
  }
}

export interface AlertCheckoutInput {
  email: string
  sicCodes: string[]
}

export interface AlertSubscriptionRecord {
  id: string
  email: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: string
  sicCodes: string[]
  createdAt: string
  updatedAt: string
  lastAlertSentAt: string | null
}

export interface AlertRunCompanyRecord {
  companyNumber: string
  companyName: string
  incorporationDate: string
  location: string
  matchedSicCodes: string[]
}

export interface AlertRunRecord {
  id: string
  subscriptionId: string
  periodStart: string
  periodEnd: string
  matchCount: number
  trackedSicCodes: string[]
  topCities: DistributionPoint[]
  accessToken: string
  createdAt: string
  companies: AlertRunCompanyRecord[]
}
