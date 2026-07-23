import { NextResponse } from "next/server"
import { inviteWorkspaceMember } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function POST(request: Request) { try { const { db, session } = await getAgencyRequestContext(true); const { email } = (await request.json()) as { email?: string }; if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address."); await inviteWorkspaceMember(db, session.workspaceId, email); return NextResponse.json({ ok: true }) } catch (error) { return agencyError(error) } }
