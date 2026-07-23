import { NextResponse } from "next/server"
import { fetchCompanyPostalAddress } from "@/lib/companies-house"
import { createStannpProvider } from "@/lib/agency/stannp"
import { completeMailBatch, getMailItemForDispatch, getSenderProfile, listPendingMailItems, refundCredit, renderLetter, reserveCredits, updateMailItem } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

export async function POST(request: Request) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const { batchId, test = false } = await request.json() as { batchId: string; test?: boolean }
    const env = await getAgencyRuntimeEnv(); const sender = await getSenderProfile(db, session.workspaceId)
    if (!sender) throw new Error("Complete the sender profile before mailing.")
    const items = await listPendingMailItems(db, session.workspaceId, batchId)
    if (!items.length) throw new Error("This batch has no pending letters.")
    if (!test) await reserveCredits(db, session.workspaceId, batchId, items.length)
    const apiKey = requireAgencyEnvValue(env.COMPANIES_HOUSE_API_KEY, "COMPANIES_HOUSE_API_KEY")
    const provider = createStannpProvider(requireAgencyEnvValue(env.STANNP_API_KEY, "STANNP_API_KEY"))
    const results: Array<{ itemId: string; status: string; error?: string; pdfUrl?: string }> = []
    for (const item of items) {
      try {
        const row = await getMailItemForDispatch(db, session.workspaceId, item.id)
        if (!row) throw new Error("Mail item not found.")
        const address = await fetchCompanyPostalAddress(apiKey, row.company_number)
        const html = renderLetter(row, sender, address)
        const letter = await provider.createLetter({ companyName: row.company_name, address, html, tags: `workspace:${session.workspaceId},batch:${batchId}`, idempotencyKey: row.idempotency_key, test })
        if (!test) await updateMailItem(db, item.id, { status: "submitted", address, html, stannpId: letter.id, costPence: letter.costPence, providerStatus: letter.status, pdfUrl: letter.pdfUrl })
        results.push({ itemId: item.id, status: test ? "test" : "submitted", pdfUrl: letter.pdfUrl })
      } catch (error) {
        if (!test) { await updateMailItem(db, item.id, { status: "failed", error: error instanceof Error ? error.message : "Unable to submit letter." }); await refundCredit(db, session.workspaceId, item.id) }
        results.push({ itemId: item.id, status: "failed", error: error instanceof Error ? error.message : "Unable to submit letter." })
      }
    }
    if (!test) await completeMailBatch(db, session.workspaceId, batchId, results.some((item) => item.status === "submitted") ? "completed" : "failed")
    return NextResponse.json({ test, results })
  } catch (error) { return agencyError(error) }
}
