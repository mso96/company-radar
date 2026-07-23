import { NextResponse } from "next/server"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { listAgencySegments, listTemplateLibrary } from "@/lib/agency/db"

export async function GET() {
  try {
    const { db } = await getAgencyRequestContext()
    const segments = await listAgencySegments(db)
    const templates = await listTemplateLibrary(db)
    return NextResponse.json({ segments, templates })
  } catch (error) {
    return agencyError(error)
  }
}
