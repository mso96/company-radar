import { cookies } from "next/headers"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"
import { getAgencySession } from "@/lib/agency/db"
import { getLocalAgencyDemoSession, isLocalAgencyDemoEnabled, LOCAL_DEMO_SESSION_TOKEN } from "@/lib/agency/demo"

export const AGENCY_SESSION_COOKIE = "company_radar_session"

export async function getCurrentAgencySession() {
  try {
    const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value
    if (!token) return null
    if (isLocalAgencyDemoEnabled() && token === LOCAL_DEMO_SESSION_TOKEN) return getLocalAgencyDemoSession()
    const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
    return getAgencySession(db, token)
  } catch {
    // A local Next server may not have the Cloudflare D1 binding. Treat that
    // as an unauthenticated session so /app can redirect to the login screen
    // instead of rendering Next's generic Internal Server Error page.
    return null
  }
}

export async function requireAgencySession() {
  const session = await getCurrentAgencySession()
  if (!session) throw new Error("Authentication required.")
  return session
}

export function assertWorkspaceOwner(role: string) {
  if (role !== "owner") throw new Error("Only the workspace owner can perform this action.")
}
