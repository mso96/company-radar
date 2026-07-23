import { NextResponse } from "next/server"
import { getSenderProfile, saveSenderProfile } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function GET() { try { const { db, session } = await getAgencyRequestContext(); return NextResponse.json({ sender: await getSenderProfile(db, session.workspaceId) }) } catch (error) { return agencyError(error) } }
export async function PUT(request: Request) { try { const { db, session } = await getAgencyRequestContext(true); await saveSenderProfile(db, session.workspaceId, await request.json()); return NextResponse.json({ ok: true }) } catch (error) { return agencyError(error) } }
