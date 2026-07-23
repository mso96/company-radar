import { cookies } from "next/headers"
import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"
import { ensureAgencyUserAndWorkspace, getAgencySession, getAgencySessionForUser } from "@/lib/agency/db"
import { getLocalAgencyDemoSession, isLocalAgencyDemoEnabled, LOCAL_DEMO_SESSION_TOKEN } from "@/lib/agency/demo"

export const AGENCY_SESSION_COOKIE = "company_radar_session"

function isClerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)
}

async function getClerkAgencySession() {
  if (!isClerkConfigured()) return null
  const { userId } = await clerkAuth()
  if (!userId) return null
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress
  if (!email) return null
  const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
  const identity = await ensureAgencyUserAndWorkspace(db, email, userId)
  return getAgencySessionForUser(db, identity.userId)
}

export async function getCurrentAgencySession() {
  try {
    const clerkSession = await getClerkAgencySession()
    if (clerkSession) return clerkSession
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
