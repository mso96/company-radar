import { NextResponse } from "next/server"
import { scanWorkspaceRadars } from "@/lib/agency/scanner"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

export async function POST(_request: Request, context: { params: Promise<{ radarId: string }> }) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const radarId = (await context.params).radarId
    const radar = await db.prepare(`SELECT last_scan_started_at FROM agency_radars WHERE id=?1 AND workspace_id=?2`).bind(radarId,session.workspaceId).first<{last_scan_started_at:string|null}>()
    if (!radar) throw new Error("Campaign not found.")
    if (radar.last_scan_started_at && Date.now() - new Date(radar.last_scan_started_at).getTime() < 5 * 60_000) return NextResponse.json({ error: "This campaign was checked recently. Try again in a few minutes." }, { status: 429 })
    const apiKey = requireAgencyEnvValue((await getAgencyRuntimeEnv()).COMPANIES_HOUSE_API_KEY, "COMPANIES_HOUSE_API_KEY")
    return NextResponse.json(await scanWorkspaceRadars(db, apiKey, session, radarId))
  } catch (error) { return agencyError(error) }
}
