import { NextResponse } from "next/server"
import { updateRadarStatus } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function POST(_request: Request, context: { params: Promise<{ radarId: string }> }) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    await updateRadarStatus(db, session.workspaceId, (await context.params).radarId, true)
    return NextResponse.json({ ok: true, activated: true })
  } catch (error) {
    return agencyError(error)
  }
}
