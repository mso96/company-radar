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

const MAX_COMPANIES_HOUSE_RETRIES = 3
const SAMPLE_SIZES: Record<DateRangeKey, number> = {
  today: 5000,
  yesterday: 5000,
  last7: 80,
  last30: 40,
}

const INSIGHT_DAY_LIMITS: Record<DateRangeKey, number> = {
  today: 1,
  yesterday: 1,
  last7: 7,
  last30: 6,
}

interface CompaniesHouseItem {
  company_name?: string
  company_number?: string
  date_of_creation?: string
  company_status?: string
  company_type?: string
  registered_office_address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    region?: string
    postal_code?: string
    country?: string
  }
  sic_codes?: string[]
}

export interface CompaniesHousePostalAddress { address1: string; address2?: string; town: string; county?: string; postcode: string; country: string }

interface CompaniesHouseAdvancedSearchResponse {
  hits?: number
  items?: CompaniesHouseItem[]
}

export interface CompaniesHouseEventSource {
  key: string
  eventType:
    | "company.filing.changed"
    | "company.officer.changed"
    | "company.psc.changed"
    | "company.charge.created"
    | "company.status.changed"
  records: Array<Record<string, unknown>>
  eventAt: (record: Record<string, unknown>) => string
}

interface DailyCompaniesResult {
  companies: CompanyRecord[]
  date: string
  hits: number
}

interface CompaniesQueryResult {
  companies: CompanyRecord[]
  hits: number
}

interface CompaniesRangeParams {
  start: string
  end: string
  size: number
  location?: string
  sicCodes?: string[]
  startIndex?: number
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
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "COMPANIES_HOUSE_API_KEY is missing in the production runtime environment."
      )
    }

    const companies = getDemoCompanies(dateRange.end)
    return {
      companies,
      insights: buildInsights(companies, companies.length),
      source: "demo",
      dateRange,
    }
  }

  const dailyResults = await fetchCompaniesByDay(
    apiKey,
    dateRange.start,
    dateRange.end,
    SAMPLE_SIZES[range],
    INSIGHT_DAY_LIMITS[range]
  )
  const companiesForInsights = dailyResults.flatMap((result) => result.companies)
  const companiesForTable = companiesForInsights.slice(0, 1000)
  const totalCompanies = dailyResults.reduce((sum, result) => sum + result.hits, 0)
  const registrationTrend = dailyResults
    .map((result) => ({ date: result.date, registrations: result.hits }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const exactTopCities = await fetchExactTopCities(
    apiKey,
    dateRange.start,
    dateRange.end,
    companiesForInsights
  )

  return {
    companies: companiesForTable,
    insights: buildInsights(
      companiesForInsights,
      totalCompanies,
      registrationTrend,
      exactTopCities
    ),
    source: "api",
    dateRange,
  }
}

async function fetchCompaniesByDay(
  apiKey: string,
  start: string,
  end: string,
  sampleSize: number,
  insightDayLimit: number
) {
  const dates = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
    .map((date) => format(date, "yyyy-MM-dd"))
    .reverse()

  const results: DailyCompaniesResult[] = []
  const batchSize = 2

  for (let index = 0; index < dates.length; index += batchSize) {
    const batch = dates.slice(index, index + batchSize)
    const batchResults = await Promise.all(
      batch.map((date, batchIndex) =>
        fetchCompaniesForDate(
          apiKey,
          date,
          index + batchIndex < insightDayLimit ? sampleSize : 1
        )
      )
    )
    results.push(...batchResults)
  }

  return results
}

async function fetchCompaniesForRange(
  apiKey: string,
  start: string,
  end: string,
  size = 1
): Promise<CompaniesQueryResult> {
  const payload = await fetchCompaniesHouse(apiKey, { start, end, size })
  return {
    companies: (payload.items ?? []).map(normalizeCompany),
    hits: payload.hits ?? payload.items?.length ?? 0,
  }
}

async function fetchExactTopCities(
  apiKey: string,
  start: string,
  end: string,
  companies: CompanyRecord[]
) {
  const candidateCities = Array.from(
    new Set(["London", ...countBy(companies.map((company) => cityFromLocation(company.location))).slice(0, 7).map((point) => point.name)])
  ).filter(Boolean)

  const results: DistributionPoint[] = []

  for (const city of candidateCities) {
    const payload = await fetchCompaniesHouse(apiKey, {
      start,
      end,
      size: 1,
      location: city,
    })

    results.push({
      name: city,
      value: payload.hits ?? payload.items?.length ?? 0,
    })
  }

  return results
    .filter((point) => point.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

async function fetchCompaniesForDate(
  apiKey: string,
  date: string,
  sampleSize: number
): Promise<DailyCompaniesResult> {
  const result = await fetchCompaniesForRange(apiKey, date, date, sampleSize)
  return {
    companies: result.companies,
    date,
    hits: result.hits,
  }
}

async function fetchCompaniesHouse(
  apiKey: string,
  paramsInput: CompaniesRangeParams
): Promise<CompaniesHouseAdvancedSearchResponse> {
  const params = new URLSearchParams({
    incorporated_from: paramsInput.start,
    incorporated_to: paramsInput.end,
    size: String(paramsInput.size),
  })

  if (typeof paramsInput.startIndex === "number") {
    params.set("start_index", String(paramsInput.startIndex))
  }

  if (paramsInput.location) {
    params.set("location", paramsInput.location)
  }

  if (paramsInput.sicCodes?.length) {
    params.set("sic_codes", paramsInput.sicCodes.join(","))
  }

  const url = `https://api.company-information.service.gov.uk/advanced-search/companies?${params.toString()}`
  let lastStatus = 0

  for (let attempt = 0; attempt < MAX_COMPANIES_HOUSE_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
      cache: "no-store",
    })

    if (response.ok) {
      return (await response.json()) as CompaniesHouseAdvancedSearchResponse
    }

    lastStatus = response.status

    if (response.status === 404) {
      return { items: [], hits: 0 }
    }

    if (response.status === 401) {
      throw new Error(
        "Companies House rejected the API key. Check that COMPANIES_HOUSE_API_KEY is a valid REST API key."
      )
    }

    const shouldRetry = response.status >= 500 || response.status === 429
    if (!shouldRetry || attempt === MAX_COMPANIES_HOUSE_RETRIES - 1) {
      break
    }

    await sleep(250 * (attempt + 1))
  }

  throw new Error(
    `Companies House request failed with status ${lastStatus} for range ${paramsInput.start} to ${paramsInput.end}.`
  )
}

export async function fetchCompaniesForSicAlerts(
  apiKey: string,
  startDate: string,
  endDate: string,
  sicCode: string
) {
  const pageSize = 5000
  const companies: CompanyRecord[] = []
  let startIndex = 0
  let hits = 0

  do {
    const payload = await fetchCompaniesHouse(apiKey, {
      start: startDate,
      end: endDate,
      size: pageSize,
      startIndex,
      sicCodes: [sicCode],
    })

    const pageCompanies = (payload.items ?? []).map(normalizeCompany)
    hits = payload.hits ?? pageCompanies.length
    companies.push(...pageCompanies)
    startIndex += pageCompanies.length

    if (pageCompanies.length < pageSize) {
      break
    }
  } while (startIndex < hits)

  return Array.from(
    new Map(companies.map((company) => [company.companyNumber, company])).values()
  )
}

export async function fetchCompanyEventSources(
  apiKey: string,
  companyNumber: string
): Promise<CompaniesHouseEventSource[]> {
  const companyUrl = `https://api.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`
  const definitions: Array<Omit<CompaniesHouseEventSource, "records"> & { url: string; recordsFrom: (payload: Record<string, unknown>) => Array<Record<string, unknown>> }> = [
    { key: "profile", eventType: "company.status.changed", url: companyUrl, recordsFrom: (payload) => [payload], eventAt: (record) => String(record.date_of_creation ?? new Date().toISOString()) },
    { key: "filing-history", eventType: "company.filing.changed", url: `${companyUrl}/filing-history?items_per_page=25`, recordsFrom: itemsFrom, eventAt: (record) => String(record.date ?? record.action_date ?? new Date().toISOString()) },
    { key: "officers", eventType: "company.officer.changed", url: `${companyUrl}/officers?items_per_page=25`, recordsFrom: itemsFrom, eventAt: (record) => String(record.appointed_on ?? record.resigned_on ?? new Date().toISOString()) },
    { key: "psc", eventType: "company.psc.changed", url: `${companyUrl}/persons-with-significant-control?items_per_page=25`, recordsFrom: itemsFrom, eventAt: (record) => String(record.notified_on ?? record.ceased_on ?? new Date().toISOString()) },
    { key: "charges", eventType: "company.charge.created", url: `${companyUrl}/charges?items_per_page=25`, recordsFrom: itemsFrom, eventAt: (record) => String(record.created_on ?? record.delivered_on ?? new Date().toISOString()) },
  ]

  return Promise.all(definitions.map(async (definition) => {
    const payload = await fetchCompaniesHouseDocument(apiKey, definition.url)
    return { key: definition.key, eventType: definition.eventType, records: definition.recordsFrom(payload), eventAt: definition.eventAt }
  }))
}

export async function fetchCompanyPostalAddress(apiKey: string, companyNumber: string): Promise<CompaniesHousePostalAddress> {
  const payload = await fetchCompaniesHouseDocument(apiKey, `https://api.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`)
  const office = (payload.registered_office_address ?? {}) as Record<string, unknown>
  const address1 = String(office.address_line_1 ?? "").trim()
  const town = String(office.locality ?? "").trim()
  const postcode = String(office.postal_code ?? "").trim()
  if (!address1 || !town || !postcode) throw new Error("Companies House did not return a complete registered-office address.")
  return { address1, address2: String(office.address_line_2 ?? "").trim() || undefined, town, county: String(office.region ?? "").trim() || undefined, postcode, country: String(office.country ?? "GB").trim() || "GB" }
}

async function fetchCompaniesHouseDocument(apiKey: string, url: string): Promise<Record<string, unknown>> {
  let lastStatus = 0
  for (let attempt = 0; attempt < MAX_COMPANIES_HOUSE_RETRIES; attempt += 1) {
    const response = await fetch(url, { headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` }, cache: "no-store" })
    if (response.ok) return (await response.json()) as Record<string, unknown>
    lastStatus = response.status
    if (response.status === 404) return {}
    if (response.status === 401) throw new Error("Companies House rejected the API key.")
    if ((response.status < 500 && response.status !== 429) || attempt === MAX_COMPANIES_HOUSE_RETRIES - 1) break
    await sleep(500 * (attempt + 1))
  }
  throw new Error(`Companies House request failed with status ${lastStatus}.`)
}

function itemsFrom(payload: Record<string, unknown>) {
  return Array.isArray(payload.items)
    ? payload.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : []
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  registrationTrend = buildRegistrationTrend(companies),
  exactTopCities?: DistributionPoint[]
): InsightSummary {
  const topCities =
    exactTopCities && exactTopCities.length
      ? exactTopCities
      : countBy(companies.map((company) => cityFromLocation(company.location))).slice(0, 6)
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
  const companyTypeDistribution = countBy(
    companies.map((company) => formatCompanyType(company.type))
  ).slice(0, 5)

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
    companyTypeDistribution,
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

function formatCompanyType(type: string) {
  const labels: Record<string, string> = {
    ltd: "Limited company",
    llp: "LLP",
    "private-limited-guarant-nsc": "Guarantee company",
    plc: "Public limited company",
    "private-unlimited": "Unlimited company",
  }

  return labels[type] ?? type.replaceAll("-", " ")
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
