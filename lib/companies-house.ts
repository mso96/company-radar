import { eachDayOfInterval, format, parseISO, subDays } from "date-fns"
import type {
  CompaniesResponse,
  CompanyRecord,
  DateRangeKey,
  DistributionPoint,
  TrendPoint,
  InsightSummary,
} from "@/lib/types"
import { SIC_LABELS } from "@/lib/sic-codes"

const KEYWORDS = [
  "AI",
  "Tech",
  "Digital",
  "Ventures",
  "Capital",
  "Property",
  "Studio",
  "Labs",
]

const REGION_HINTS: Array<[string, string]> = [
  ["london", "London"],
  ["manchester", "North West"],
  ["liverpool", "North West"],
  ["leeds", "Yorkshire and The Humber"],
  ["sheffield", "Yorkshire and The Humber"],
  ["birmingham", "West Midlands"],
  ["coventry", "West Midlands"],
  ["bristol", "South West"],
  ["exeter", "South West"],
  ["cambridge", "East of England"],
  ["norwich", "East of England"],
  ["oxford", "South East"],
  ["brighton", "South East"],
  ["newcastle", "North East"],
  ["cardiff", "Wales"],
  ["swansea", "Wales"],
  ["edinburgh", "Scotland"],
  ["glasgow", "Scotland"],
  ["belfast", "Northern Ireland"],
]

interface CompaniesHouseItem {
  company_name?: string
  company_number?: string
  date_of_creation?: string
  company_status?: string
  company_type?: string
  registered_office_address?: {
    locality?: string
    region?: string
    postal_code?: string
    country?: string
  }
  sic_codes?: string[]
}

interface CompaniesHouseAdvancedSearchResponse {
  hits?: number
  items?: CompaniesHouseItem[]
}

interface DailyCompaniesResult {
  companies: CompanyRecord[]
  date: string
  hits: number
}

export function getDateRange(range: DateRangeKey) {
  const now = new Date()
  if (range === "today") {
    const today = format(now, "yyyy-MM-dd")
    return { start: today, end: today }
  }

  if (range === "yesterday") {
    const yesterday = format(subDays(now, 1), "yyyy-MM-dd")
    return { start: yesterday, end: yesterday }
  }

  const daysByRange: Record<Exclude<DateRangeKey, "today" | "yesterday">, number> = {
    last7: 6,
    last30: 29,
    last60: 59,
  }

  return {
    start: format(subDays(now, daysByRange[range]), "yyyy-MM-dd"),
    end: format(now, "yyyy-MM-dd"),
  }
}

export async function fetchCompanies(range: DateRangeKey): Promise<CompaniesResponse> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  const dateRange = getDateRange(range)

  if (!apiKey) {
    const companies = getDemoCompanies(dateRange.end)
    return {
      companies,
      insights: buildInsights(companies, companies.length),
      source: "demo",
      dateRange,
    }
  }

  const dailyResults = await fetchCompaniesByDay(apiKey, dateRange.start, dateRange.end)
  const companiesForInsights = dailyResults.flatMap((result) => result.companies)
  const companiesForTable = companiesForInsights.slice(0, 1000)
  const totalCompanies = dailyResults.reduce((sum, result) => sum + result.hits, 0)
  const registrationTrend = dailyResults
    .map((result) => ({ date: result.date, registrations: result.hits }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    companies: companiesForTable,
    insights: buildInsights(companiesForInsights, totalCompanies, registrationTrend),
    source: "api",
    dateRange,
  }
}

async function fetchCompaniesByDay(apiKey: string, start: string, end: string) {
  const dates = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
    .map((date) => format(date, "yyyy-MM-dd"))
    .reverse()

  const results: DailyCompaniesResult[] = []
  const batchSize = 6

  for (let index = 0; index < dates.length; index += batchSize) {
    const batch = dates.slice(index, index + batchSize)
    const batchResults = await Promise.all(
      batch.map((date) => fetchCompaniesForDate(apiKey, date))
    )
    results.push(...batchResults)
  }

  return results
}

async function fetchCompaniesForDate(
  apiKey: string,
  date: string
): Promise<DailyCompaniesResult> {
  const params = new URLSearchParams({
    incorporated_from: date,
    incorporated_to: date,
    size: "5000",
  })

  const response = await fetch(
    `https://api.company-information.service.gov.uk/advanced-search/companies?${params.toString()}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return { companies: [], date, hits: 0 }
    }

    if (response.status === 401) {
      throw new Error(
        "Companies House rejected the API key. Check that COMPANIES_HOUSE_API_KEY is a valid REST API key."
      )
    }

    throw new Error(`Companies House request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as CompaniesHouseAdvancedSearchResponse
  return {
    companies: (payload.items ?? []).map(normalizeCompany),
    date,
    hits: payload.hits ?? payload.items?.length ?? 0,
  }
}

function normalizeCompany(item: CompaniesHouseItem): CompanyRecord {
  const office = item.registered_office_address ?? {}
  const location = [office.locality, office.region, office.postal_code]
    .filter(Boolean)
    .join(", ")

  const companyName = item.company_name ?? "Unknown company"

  return {
    companyName,
    companyNumber: item.company_number ?? "Unknown",
    incorporationDate: item.date_of_creation ?? "",
    status: item.company_status ?? "unknown",
    type: item.company_type ?? "unknown",
    location: location || office.country || "Unknown",
    region: inferRegion(location || office.country || ""),
    sicCodes: item.sic_codes ?? [],
    matchedKeywords: findKeywords(companyName),
  }
}

function buildInsights(
  companies: CompanyRecord[],
  totalCompanies = companies.length,
  registrationTrend = buildRegistrationTrend(companies)
): InsightSummary {
  const topCities = countBy(companies.map((company) => cityFromLocation(company.location))).slice(0, 6)
  const topRegions = countBy(companies.map((company) => company.region)).slice(0, 6)
  const topSicCodes = countBy(
    companies.flatMap((company) =>
      company.sicCodes.length ? company.sicCodes.map(labelSicCode) : ["Unclassified"]
    )
  ).slice(0, 7)
  const topActivities = topSicCodes.map((point) => {
    const code = point.name.split(" - ")[0] ?? point.name
    return {
      code,
      description: SIC_LABELS[code] ?? "SIC business activity description not available",
      value: point.value,
    }
  })
  const keywordMatches = KEYWORDS.map((keyword) => ({
    name: keyword,
    value: companies.filter((company) => company.matchedKeywords.includes(keyword)).length,
  }))
  const industryDistribution = topSicCodes.slice(0, 5)
  const fastestGrowingSectors = topSicCodes.slice(0, 5)

  return {
    totalCompanies,
    topCities,
    topRegions,
    topSicCodes,
    topActivities,
    fastestGrowingSectors,
    keywordMatches,
    industryDistribution,
    regionalDistribution: topRegions,
    registrationTrend,
    businessInsights: [
      makeInsight("Most active industries", topSicCodes),
      makeInsight("Regional growth patterns", topRegions),
      makeInsight("Emerging business categories", fastestGrowingSectors),
      makeInsight("Sector distribution analysis", industryDistribution),
    ],
  }
}

function countBy(values: string[]): DistributionPoint[] {
  const counts = new Map<string, number>()
  values.filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function buildRegistrationTrend(companies: CompanyRecord[]): TrendPoint[] {
  return countBy(companies.map((company) => company.incorporationDate || "Unknown"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((point) => ({ date: point.name, registrations: point.value }))
}

function makeInsight(label: string, points: DistributionPoint[]) {
  const leader = points[0]
  if (!leader) {
    return `${label}: not enough incorporation data for this period.`
  }
  return `${label}: ${leader.name} leads with ${leader.value} companies.`
}

function labelSicCode(code: string) {
  return SIC_LABELS[code] ? `${code} - ${SIC_LABELS[code]}` : code
}

function cityFromLocation(location: string) {
  return location.split(",")[0]?.trim() || "Unknown"
}

function inferRegion(location: string) {
  const normalized = location.toLowerCase()
  return REGION_HINTS.find(([hint]) => normalized.includes(hint))?.[1] ?? "Other UK"
}

function findKeywords(companyName: string) {
  const normalized = companyName.toLowerCase()
  return KEYWORDS.filter((keyword) => normalized.includes(keyword.toLowerCase()))
}

function getDemoCompanies(baseDate: string): CompanyRecord[] {
  const seeds = [
    ["NOVA AI LABS LTD", "16240001", "62012", "London, EC1A", "London"],
    ["BRIGHT DIGITAL STUDIO LTD", "16240002", "74100", "Brighton, BN1", "South East"],
    ["CAPITAL PROPERTY VENTURES LTD", "16240003", "68100", "Manchester, M1", "North West"],
    ["CIVIC TECH PARTNERS LTD", "16240004", "62020", "Leeds, LS1", "Yorkshire and The Humber"],
    ["GREENFIELD CAPITAL HOLDINGS LTD", "16240005", "64209", "Bristol, BS1", "South West"],
    ["SIGNAL AI SYSTEMS LTD", "16240006", "62012", "Cambridge, CB1", "East of England"],
    ["FOUNDRY VENTURES LTD", "16240007", "70229", "Birmingham, B1", "West Midlands"],
    ["KINETIC PROPERTY GROUP LTD", "16240008", "68100", "Cardiff, CF10", "Wales"],
    ["NORTHSTAR DIGITAL LTD", "16240009", "73110", "Edinburgh, EH1", "Scotland"],
    ["ATLAS TECH LABS LTD", "16240010", "62020", "Newcastle, NE1", "North East"],
    ["MERCURY STUDIO WORKS LTD", "16240011", "74100", "Glasgow, G1", "Scotland"],
    ["HARBOUR BUSINESS SUPPORT LTD", "16240012", "82990", "Liverpool, L1", "North West"],
  ]

  return seeds.map(([companyName, companyNumber, sicCode, location, region], index) => ({
    companyName,
    companyNumber,
    incorporationDate: format(subDays(new Date(baseDate), index % 5), "yyyy-MM-dd"),
    status: "active",
    type: "ltd",
    location,
    region,
    sicCodes: [sicCode],
    matchedKeywords: findKeywords(companyName),
  }))
}

export { KEYWORDS }
