import type { PostalAddress } from "@/lib/agency/types"
import type { DirectMailLetterInput, DirectMailLetterResult, DirectMailProvider } from "@/lib/agency/provider"

const baseUrl = "https://api-eu1.stannp.com/api/v1"
export interface StannpLetterResult extends DirectMailLetterResult {}

export async function createStannpLetter(input: { apiKey: string; companyName: string; address: PostalAddress; html: string; tags: string; idempotencyKey: string; test?: boolean }) {
  const form = new URLSearchParams({ pages: input.html, "recipient[company]": input.companyName, "recipient[address1]": input.address.address1, "recipient[town]": input.address.town, "recipient[postcode]": input.address.postcode, "recipient[country]": input.address.country || "GB", duplex: "true", clearzone: "true", post_unverified: "false", tags: input.tags, idempotency_key: input.idempotencyKey, test: input.test ? "true" : "false" })
  if (input.address.address2) form.set("recipient[address2]", input.address.address2)
  const response = await fetchStannp(() => fetch(`${baseUrl}/letters/create`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${input.apiKey}:`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form }))
  const payload = await response.json().catch(() => ({})) as { success?: boolean; data?: Record<string, unknown>; error?: string }
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? `Stannp request failed (${response.status}).`)
  return mapResult(payload.data)
}

export async function getStannpLetter(apiKey: string, id: string) {
  const response = await fetchStannp(() => fetch(`${baseUrl}/letters/get/${encodeURIComponent(id)}`, { headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` } }))
  const payload = await response.json().catch(() => ({})) as { success?: boolean; data?: Record<string, unknown>; error?: string }
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? `Stannp status request failed (${response.status}).`)
  return mapResult(payload.data)
}

export async function cancelStannpLetter(apiKey: string, id: string) {
  const response = await fetchStannp(() => fetch(`${baseUrl}/letters/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ id }),
  }))
  const payload = await response.json().catch(() => ({})) as { success?: boolean; error?: string }
  if (!response.ok || payload.success === false) throw new Error(payload.error ?? `Stannp cancel request failed (${response.status}).`)
}

export function createStannpProvider(apiKey: string): DirectMailProvider {
  return {
    createLetter: (input: DirectMailLetterInput) => createStannpLetter({ apiKey, ...input }),
    createTestPdf: (input) => createStannpLetter({ apiKey, ...input, test: true }),
    getStatus: (id) => getStannpLetter(apiKey, id),
    cancelLetter: (id) => cancelStannpLetter(apiKey, id),
  }
}

function mapResult(data: Record<string, unknown>): StannpLetterResult { const cost = Number(data.cost); return { id: String(data.id ?? data.mailpiece_id ?? ""), status: String(data.status ?? "submitted"), costPence: Number.isFinite(cost) ? Math.round(cost * 100) : undefined, pdfUrl: typeof data.pdf === "string" ? data.pdf : typeof data.pdf_file === "string" ? data.pdf_file : undefined } }

async function fetchStannp(request: () => Promise<Response>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request()
    if (response.ok || (response.status !== 429 && response.status < 500) || attempt === 2) return response
    const retryAfter = Number(response.headers.get("retry-after"))
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 4000) : 250 * 2 ** attempt
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  throw new Error("Stannp request failed after retries.")
}
