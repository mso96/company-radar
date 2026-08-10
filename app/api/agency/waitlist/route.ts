import { NextResponse } from "next/server"
import { getAgencyRuntimeEnv, requireAgencyDatabase } from "@/lib/agency/runtime"

const MAX_BODY_BYTES = 4096
const MAX_EMAIL_LENGTH = 254

class WaitlistRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readSmallJson(request) as { email?: unknown; company?: unknown }
    if (typeof payload.company === "string" && payload.company.trim()) return NextResponse.json({ ok: true })

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : ""
    if (!email || email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new WaitlistRequestError("Enter a valid email address.", 400)
    }

    const db = requireAgencyDatabase(await getAgencyRuntimeEnv())
    const timestamp = new Date().toISOString()
    await db.prepare(`INSERT INTO agency_waitlist (id, email, status, source, created_at, updated_at) VALUES (?1, ?2, 'waiting', 'agency_page', ?3, ?3) ON CONFLICT(email) DO NOTHING`).bind(crypto.randomUUID(), email, timestamp).run()
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof WaitlistRequestError) return NextResponse.json({ error: error.message }, { status: error.status })
    const unavailable = error instanceof Error && error.message.includes("ALERTS_DB")
    return NextResponse.json({ error: unavailable ? "The waitlist is temporarily unavailable. Please try again shortly." : "Unable to join the waitlist. Please try again." }, { status: 503 })
  }
}

async function readSmallJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new WaitlistRequestError("Request is too large.", 413)
  if (!request.body) throw new WaitlistRequestError("Enter a valid email address.", 400)

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > MAX_BODY_BYTES) {
      await reader.cancel()
      throw new WaitlistRequestError("Request is too large.", 413)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown } catch { throw new WaitlistRequestError("Invalid request.", 400) }
}
