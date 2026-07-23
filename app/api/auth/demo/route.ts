import { NextResponse } from "next/server"
import { AGENCY_SESSION_COOKIE } from "@/lib/agency/auth"
import { isLocalAgencyDemoEnabled, LOCAL_DEMO_SESSION_TOKEN } from "@/lib/agency/demo"

export async function POST(request: Request) {
  if (!isLocalAgencyDemoEnabled()) return new NextResponse(null, { status: 404 })
  const response = NextResponse.json({ ok: true, redirect: "/app" })
  response.cookies.set(AGENCY_SESSION_COOKIE, LOCAL_DEMO_SESSION_TOKEN, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 })
  return response
}
