import { NextResponse } from "next/server"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext()
    const input = await request.json() as { radarId?: string; sicCodes?: string[]; companyAgeDays?: number; city?: string }
    const radarId = input.radarId?.trim()
    const row = radarId ? await db.prepare(`SELECT COUNT(*) AS count FROM agency_leads WHERE workspace_id = ?1 AND radar_id = ?2`).bind(session.workspaceId, radarId).first<{ count: number }>() : null
    return NextResponse.json({ matchingCompanies: Number(row?.count ?? 0), previewOnly: true, filters: input })
  } catch (error) {
    return agencyError(error)
  }
}
