import { NextResponse } from "next/server"
import { createRadar, listRadars } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import type { CreateRadarInput } from "@/lib/agency/types"
import { createCampaignTemplateSnapshot } from "@/lib/agency/mail"
import { getSenderProfile, senderReadiness } from "@/lib/agency/mail"
import { scanWorkspaceRadars } from "@/lib/agency/scanner"
import { getAgencyRuntimeEnv, requireAgencyEnvValue } from "@/lib/agency/runtime"

export async function GET() { try { const { db, session } = await getAgencyRequestContext(); return NextResponse.json({ radars: await listRadars(db, session.workspaceId) }) } catch (error) { return agencyError(error) } }
export async function POST(request: Request) { try {
  const { db, session } = await getAgencyRequestContext(true)
  const input = (await request.json()) as CreateRadarInput
  const readiness = senderReadiness(await getSenderProfile(db, session.workspaceId))
  if (!readiness.ready) throw new Error(`Complete sender setup before activating: ${readiness.missing.join(", ")}.`)
  if (!input.mailTemplateId) throw new Error("Choose a saved letter template.")
  input.deliveryFrequency = "daily"
  input.autoQueueLetters = false
  input.approvalRequired = true
  input.mailTemplateId = await createCampaignTemplateSnapshot(db, session.workspaceId, input.mailTemplateId, input.name)
  const id = await createRadar(db, session.workspaceId, input)
  let scan: { leads: number } | null = null
  try {
    const env = await getAgencyRuntimeEnv()
    scan = await scanWorkspaceRadars(db, requireAgencyEnvValue(env.COMPANIES_HOUSE_API_KEY, "COMPANIES_HOUSE_API_KEY"), session, id)
  } catch { /* campaign stays active and the scan error is visible in its detail */ }
  return NextResponse.json({ id, scan }, { status: 201 })
} catch (error) { return agencyError(error) } }
