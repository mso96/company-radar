import { NextResponse } from "next/server"
import { addWatchlistCompany, listWatchlist } from "@/lib/agency/db"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import type { WatchRelationship } from "@/lib/agency/types"

export async function GET() { try { const { db, session } = await getAgencyRequestContext(); return NextResponse.json({ companies: await listWatchlist(db, session.workspaceId) }) } catch (error) { return agencyError(error) } }
export async function POST(request: Request) { try { const { db, session } = await getAgencyRequestContext(); const input = (await request.json()) as { companyNumber: string; companyName?: string; relationshipType: WatchRelationship }; if (!["competitor", "client"].includes(input.relationshipType)) throw new Error("Choose competitor or client."); await addWatchlistCompany(db, session.workspaceId, input); return NextResponse.json({ ok: true }, { status: 201 }) } catch (error) { return agencyError(error) } }
