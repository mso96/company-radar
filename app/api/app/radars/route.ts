import { NextResponse } from "next/server"
import { createRadar, listRadars } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import type { CreateRadarInput } from "@/lib/agency/types"

export async function GET() { try { const { db, session } = await getAgencyRequestContext(); return NextResponse.json({ radars: await listRadars(db, session.workspaceId) }) } catch (error) { return agencyError(error) } }
export async function POST(request: Request) { try { const { db, session } = await getAgencyRequestContext(true); const id = await createRadar(db, session.workspaceId, (await request.json()) as CreateRadarInput); return NextResponse.json({ id }, { status: 201 }) } catch (error) { return agencyError(error) } }
