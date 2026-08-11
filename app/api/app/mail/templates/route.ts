import { NextResponse } from "next/server"
import { archiveLetterTemplate, listLetterTemplates, saveLetterTemplate } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function GET() { try { const { db, session } = await getAgencyRequestContext(); return NextResponse.json({ templates: await listLetterTemplates(db, session.workspaceId) }) } catch (error) { return agencyError(error) } }
export async function POST(request: Request) { try { const { db, session } = await getAgencyRequestContext(true); const id = await saveLetterTemplate(db, session.workspaceId, await request.json()); return NextResponse.json({ id }, { status: 201 }) } catch (error) { return agencyError(error) } }
export async function DELETE(request: Request) { try { const { db, session } = await getAgencyRequestContext(true); const { id } = await request.json() as { id?: string }; if (!id?.trim()) throw new Error("Choose a template to remove."); await archiveLetterTemplate(db, session.workspaceId, id); return NextResponse.json({ ok: true }) } catch (error) { return agencyError(error) } }
