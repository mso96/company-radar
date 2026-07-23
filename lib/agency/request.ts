import { NextResponse } from "next/server"
import { assertWorkspaceOwner, requireAgencySession } from "@/lib/agency/auth"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"

export async function getAgencyRequestContext(ownerOnly = false) {
  const session = await requireAgencySession()
  if (ownerOnly) assertWorkspaceOwner(session.role)
  const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
  return { session, db }
}

export function agencyError(error: unknown) {
  const message = error instanceof Error ? error.message : "Agency request failed."
  return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 })
}
