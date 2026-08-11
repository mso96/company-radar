import { NextResponse } from "next/server"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const token = (await context.params).token
  if (!/^[a-f0-9]{48}$/.test(token)) return new NextResponse("Not found", { status: 404 })
  const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
  const item = await db.prepare(`SELECT id,qr_target_url,status FROM agency_mail_items WHERE qr_tracking_token=?1`).bind(token).first<{id:string;qr_target_url:string|null;status:string}>()
  let target: URL
  try { target = new URL(item?.qr_target_url ?? "") } catch { return new NextResponse("Not found", { status: 404 }) }
  if (!item || target.protocol !== "https:") return new NextResponse("Not found", { status: 404 })
  const now = new Date().toISOString()
  if (["submitted","production","dispatched"].includes(item.status)) await db.prepare(`UPDATE agency_mail_items SET qr_scan_count=qr_scan_count+1,qr_first_scanned_at=COALESCE(qr_first_scanned_at,?1),qr_last_scanned_at=?1,updated_at=?1 WHERE id=?2`).bind(now,item.id).run()
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } })
}
