import { NextResponse } from "next/server"
import { updateRadarStatus } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function PATCH(request: Request, context: { params: Promise<{ radarId: string }> }) { try { const { db, session } = await getAgencyRequestContext(true); const { isActive } = (await request.json()) as { isActive?: boolean }; await updateRadarStatus(db, session.workspaceId, (await context.params).radarId, Boolean(isActive)); return NextResponse.json({ ok: true }) } catch (error) { return agencyError(error) } }
