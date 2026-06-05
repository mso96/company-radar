export type DateRangeKey = "today" | "yesterday" | "last7" | "last30" | "last60"

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
