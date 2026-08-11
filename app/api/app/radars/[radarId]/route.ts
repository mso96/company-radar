import { NextResponse } from "next/server"
import { archiveRadar, updateRadarStatus } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function PATCH(request: Request, context: { params: Promise<{ radarId: string }> }) { try { const { db, session } = await getAgencyRequestContext(true); const { isActive } = (await request.json()) as { isActive?: boolean }; await updateRadarStatus(db, session.workspaceId, (await context.params).radarId, Boolean(isActive)); return NextResponse.json({ ok: true }) } catch (error) { return agencyError(error) } }

export async function DELETE(_request: Request, context: { params: Promise<{ radarId: string }> }) { try { const { db, session } = await getAgencyRequestContext(true); await archiveRadar(db, session.workspaceId, (await context.params).radarId); return NextResponse.json({ ok: true }) } catch (error) { return agencyError(error) } }
