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

  const cached = companiesCache.get(range)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    })
  }

  try {
    const data = await fetchCompanies(range)
    companiesCache.set(range, {
      data,
      expiresAt: Date.now() + RESPONSE_TTL_MS,
    })
    return NextResponse.json(data, {
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
