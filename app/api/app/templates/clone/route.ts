import { NextResponse } from "next/server"
import { cloneTemplateFromLibrary } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const { sourceTemplateId } = await request.json() as { sourceTemplateId?: string }
    if (!sourceTemplateId?.trim()) throw new Error("Choose a platform template first.")
    const id = await cloneTemplateFromLibrary(db, session.workspaceId, sourceTemplateId)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    return agencyError(error)
  }
}
