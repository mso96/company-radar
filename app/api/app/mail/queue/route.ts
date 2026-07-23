import { NextResponse } from "next/server"
import { createMailBatchFromLeads, listMailBatches, listMailItems } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function GET() { try { const { db, session } = await getAgencyRequestContext(); return NextResponse.json({ batches: await listMailBatches(db, session.workspaceId), items: await listMailItems(db, session.workspaceId) }) } catch (error) { return agencyError(error) } }
export async function POST(request: Request) { try { const { db, session } = await getAgencyRequestContext(true); const payload = await request.json() as { templateId: string; leadIds: string[]; name?: string }; const id = await createMailBatchFromLeads(db, { workspaceId: session.workspaceId, userId: session.userId, ...payload }); return NextResponse.json({ id }, { status: 201 }) } catch (error) { return agencyError(error) } }
