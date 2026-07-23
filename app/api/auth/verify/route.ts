import { NextResponse } from "next/server"
import { consumeMagicLink } from "@/lib/agency/db"
import { AGENCY_SESSION_COOKIE } from "@/lib/agency/auth"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")
    if (!token) return NextResponse.redirect(new URL("/agency-login?auth=missing", request.url))
    const sessionToken = await consumeMagicLink(requireAgencyDatabase(await getAgencyRuntimeEnv()), token)
    if (!sessionToken) return NextResponse.redirect(new URL("/agency-login?auth=invalid", request.url))
    const response = NextResponse.redirect(new URL("/app", request.url))
    response.cookies.set(AGENCY_SESSION_COOKIE, sessionToken, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 })
    return response
  } catch {
    return NextResponse.redirect(new URL("/agency-login?auth=configuration", request.url))
  }
}
