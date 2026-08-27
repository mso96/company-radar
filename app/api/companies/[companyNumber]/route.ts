import { NextResponse } from "next/server"
import { fetchCompanyProfile } from "@/lib/companies-house"
import { getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

export async function GET(_request: Request, context: { params: Promise<{ companyNumber: string }> }) {
  try {
    await getAgencyRequestContext()
    const companyNumber = decodeURIComponent((await context.params).companyNumber).trim().toUpperCase()
    if (!companyNumber || companyNumber.length > 12) throw new Error("A valid company number is required.")
    const env = await getAgencyRuntimeEnv()
    const apiKey = requireAgencyEnvValue(env.COMPANIES_HOUSE_API_KEY, "COMPANIES_HOUSE_API_KEY")
    return NextResponse.json(await fetchCompanyProfile(apiKey, companyNumber), { headers: { "Cache-Control": "private, max-age=120" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load company profile."
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 })
  }
}
