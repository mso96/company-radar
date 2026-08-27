import { NextResponse } from "next/server"
import { fetchCompanies } from "@/lib/companies-house"
import type { CompaniesResponse, DateRangeKey } from "@/lib/types"

const VALID_RANGES = new Set<DateRangeKey>([
  "today",
  "yesterday",
  "last7",
  "last30",
])

const RESPONSE_TTL_MS = 10 * 60 * 1000

const companiesCache = new Map<
  DateRangeKey,
  { expiresAt: number; data: CompaniesResponse }
>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rangeParam = searchParams.get("range") ?? "last7"
  const range = VALID_RANGES.has(rangeParam as DateRangeKey)
    ? (rangeParam as DateRangeKey)
    : "last7"

  const hasResultFilters = Boolean(searchParams.get("search") || searchParams.get("sic") || searchParams.get("location"))
  const hasPagination = Boolean(searchParams.get("page") || searchParams.get("pageSize"))
  const cached = hasResultFilters || hasPagination ? undefined : companiesCache.get(range)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    })
  }

  try {
    const data = await fetchCompanies(range)
    const search = (searchParams.get("search") ?? "").trim().toLowerCase()
    const sic = (searchParams.get("sic") ?? "").trim()
    const location = (searchParams.get("location") ?? "").trim().toLowerCase()
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") ?? "50") || 50))
    const filtered = data.companies.filter((company) => {
      const matchesSearch = !search || `${company.companyName} ${company.companyNumber}`.toLowerCase().includes(search)
      const matchesSic = !sic || company.sicCodes.includes(sic)
      const matchesLocation = !location || `${company.location} ${company.region}`.toLowerCase().includes(location)
      return matchesSearch && matchesSic && matchesLocation
    })
    const start = (page - 1) * pageSize
    // The API response contains a bounded company sample for the table, while
    // `insights.totalCompanies` is the authoritative Companies House hit count.
    // Never replace that aggregate with the size of the in-memory sample: doing
    // so made a 30-day window appear to contain only a few hundred companies.
    const total = hasResultFilters ? filtered.length : data.insights.totalCompanies
    const paged = { ...data, companies: filtered.slice(start, start + pageSize), insights: { ...data.insights, totalCompanies: total }, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }
    if (!hasResultFilters && !hasPagination) companiesCache.set(range, { data: paged, expiresAt: Date.now() + RESPONSE_TTL_MS })
    return NextResponse.json(paged, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch Companies House data.",
      },
      { status: 502 }
    )
  }
}
