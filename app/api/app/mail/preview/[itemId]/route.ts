import { getAgencyRequestContext, agencyError } from "@/lib/agency/request"
import { getAgencyRuntimeEnv } from "@/lib/agency/runtime"

export async function GET(_request: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { db, session } = await getAgencyRequestContext(true)
    const { itemId } = await context.params
    const row = await db.prepare(`SELECT provider_preview_key,render_hash FROM agency_mail_items WHERE id=?1 AND workspace_id=?2`).bind(itemId, session.workspaceId).first<{ provider_preview_key: string | null; render_hash: string | null }>()
    if (!row?.provider_preview_key) return new Response("Preview not found.", { status: 404 })
    const env = await getAgencyRuntimeEnv(); const object = await env.AGENCY_ASSETS?.get(row.provider_preview_key)
    if (!object) return new Response("Preview not found.", { status: 404 })
    if (!row.render_hash) return new Response("Preview is not ready.", { status: 409 })
    await db.prepare(`UPDATE agency_mail_items SET preview_opened_at=?1,preview_opened_render_hash=?2,updated_at=?1 WHERE id=?3 AND workspace_id=?4`).bind(new Date().toISOString(), row.render_hash, itemId, session.workspaceId).run()
    return new Response(object.body, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="letter-preview-${itemId}.pdf"`, "cache-control": "private, no-store" } })
  } catch (error) { return agencyError(error) }
}
