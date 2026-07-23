import { NextResponse } from "next/server"
import { scanWorkspaceRadars, scanWorkspaceWatchlist } from "@/lib/agency/scanner"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

/** Owner-only manual scan, primarily for staging and first workspace setup. */
export async function POST() {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const apiKey = requireAgencyEnvValue((await getAgencyRuntimeEnv()).COMPANIES_HOUSE_API_KEY, "COMPANIES_HOUSE_API_KEY")
    const [radars, watchlist] = await Promise.all([scanWorkspaceRadars(db, apiKey, session), scanWorkspaceWatchlist(db, apiKey, session)])
    return NextResponse.json({ radars, watchlist })
  } catch (error) { return agencyError(error) }
}
