import { NextResponse } from "next/server"
import { fetchCompanies } from "@/lib/companies-house"
import type { DateRangeKey } from "@/lib/types"

const VALID_RANGES = new Set<DateRangeKey>([
  "today",
  "yesterday",
  "last7",
  "last30",
  "last60",
])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rangeParam = searchParams.get("range") ?? "last7"
  const range = VALID_RANGES.has(rangeParam as DateRangeKey)
    ? (rangeParam as DateRangeKey)
    : "last7"

  try {
    const data = await fetchCompanies(range)
    return NextResponse.json(data)
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
