import { NextResponse } from "next/server"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getSenderProfile, renderLetter } from "@/lib/agency/mail"

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext()
    const input = await request.json() as { subject?: string; bodyHtml?: string; signature?: string; ctaText?: string; ctaUrl?: string; companyName?: string; serviceFocus?: string[] }
    const companyName = input.companyName?.trim() || "Example Company Ltd"
    const sender = await getSenderProfile(db, session.workspaceId) ?? { agencyName: session.workspaceName, replyEmail: session.email, optOutText: "To opt out, use reference PREVIEW.", address: { address1: "", town: "", postcode: "", country: "GB" } }
    const html = renderLetter({ id: "preview", idempotency_key: "preview", company_name: companyName, company_number: "00000000", incorporation_date: "Today", sic_codes_json: "[]", location: "London", suppression_reference: "PREVIEW", subject: input.subject ?? "A quick idea for {{company_name}}", body_html: input.bodyHtml ?? "Hello {{company_name}}", cta_text: input.ctaText ?? null, cta_url: input.ctaUrl ?? null, signature: input.signature ?? "Your team", service_focus_json: JSON.stringify(input.serviceFocus ?? []) }, sender, { address1: "", town: "London", postcode: "", country: "GB" })
    return NextResponse.json({ html, previewOnly: true })
  } catch (error) {
    return agencyError(error)
  }
}
