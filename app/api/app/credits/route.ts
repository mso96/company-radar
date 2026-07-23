import { NextResponse } from "next/server"
import { getCreditBalance, getCreditPacks } from "@/lib/agency/mail"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"

export async function GET() { try { const { db, session } = await getAgencyRequestContext(); return NextResponse.json({ balance: await getCreditBalance(db, session.workspaceId), packs: await getCreditPacks(db) }) } catch (error) { return agencyError(error) } }
