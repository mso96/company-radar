import type { AgencyRuntimeEnv } from "@/lib/agency/runtime"

type WaitlistRow = {
  id: string
  email: string
  status: string
  source: string
  created_at: string
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
let cachedToken: { value: string; expiresAt: number } | undefined
let headerReadyFor = ""

export function isGoogleSheetsConfigured(env: AgencyRuntimeEnv) {
  return Boolean(env.GOOGLE_SHEETS_SPREADSHEET_ID && env.GOOGLE_SHEETS_CLIENT_EMAIL && env.GOOGLE_SHEETS_PRIVATE_KEY)
}

export async function syncAgencyWaitlistRowToGoogleSheets(db: D1Database, env: AgencyRuntimeEnv, row: WaitlistRow) {
  if (!isGoogleSheetsConfigured(env)) return false

  try {
    const accessToken = await getGoogleAccessToken(env)
    const spreadsheetId = encodeURIComponent(env.GOOGLE_SHEETS_SPREADSHEET_ID!)
    const range = encodeURIComponent(env.GOOGLE_SHEETS_RANGE?.trim() || "A:D")
    await ensureHeader(accessToken, env.GOOGLE_SHEETS_SPREADSHEET_ID!)
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ values: [[row.email, row.status, row.source, row.created_at]] }),
    })
    if (!response.ok) throw new Error(`Google Sheets append failed (${response.status}).`)

    await db.prepare("UPDATE agency_waitlist SET sheet_synced_at = ?1, sheet_sync_error = NULL, updated_at = ?1 WHERE id = ?2 AND sheet_synced_at IS NULL")
      .bind(new Date().toISOString(), row.id).run()
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Google Sheets sync failed."
    await db.prepare("UPDATE agency_waitlist SET sheet_sync_error = ?1, updated_at = ?2 WHERE id = ?3 AND sheet_synced_at IS NULL")
      .bind(message, new Date().toISOString(), row.id).run()
    return false
  }
}

export async function syncPendingAgencyWaitlistToGoogleSheets(db: D1Database, env: AgencyRuntimeEnv) {
  if (!isGoogleSheetsConfigured(env)) return
  const pending = await db.prepare("SELECT id, email, status, source, created_at FROM agency_waitlist WHERE sheet_synced_at IS NULL ORDER BY created_at ASC LIMIT 100")
    .all<WaitlistRow>()
  for (const row of pending.results ?? []) await syncAgencyWaitlistRowToGoogleSheets(db, env, row)
}

async function getGoogleAccessToken(env: AgencyRuntimeEnv) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claim = base64Url(JSON.stringify({
    iss: env.GOOGLE_SHEETS_CLIENT_EMAIL,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const unsignedToken = `${header}.${claim}`
  const key = await crypto.subtle.importKey("pkcs8", pemToArrayBuffer(env.GOOGLE_SHEETS_PRIVATE_KEY!), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedToken))
  const assertion = `${unsignedToken}.${base64Url(signature)}`
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  })
  const payload = await response.json() as { access_token?: string }
  if (!response.ok || !payload.access_token) throw new Error(`Google authentication failed (${response.status}).`)
  cachedToken = { value: payload.access_token, expiresAt: Date.now() + 55 * 60_000 }
  return payload.access_token
}

async function ensureHeader(accessToken: string, spreadsheetId: string) {
  if (headerReadyFor === spreadsheetId) return
  const encodedId = encodeURIComponent(spreadsheetId)
  const headerRange = encodeURIComponent("A1:D1")
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodedId}/values/${headerRange}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`Google Sheets header check failed (${response.status}).`)
  const payload = await response.json() as { values?: unknown[][] }
  if (!payload.values?.length) {
    const update = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodedId}/values/${headerRange}?valueInputOption=RAW`, {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ values: [["Email", "Status", "Source", "Signup date"]] }),
    })
    if (!update.ok) throw new Error(`Google Sheets header creation failed (${update.status}).`)
  }
  headerReadyFor = spreadsheetId
}

function pemToArrayBuffer(value: string) {
  const normalized = value.replace(/\\n/g, "\n")
  const base64 = normalized.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

function base64Url(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}
