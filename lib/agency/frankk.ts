import type { PostalAddress } from "@/lib/agency/types"

const BASE_URL = "https://app.frankk.post/api/v1"
const MAX_SAFE_ATTEMPTS = 3

export const FRANKK_LETTER_PRODUCT = {
  pageSize: "A4 Letter",
  pageOrientation: "Portrait",
  windowGummedCode: "C5NONWINDOW",
  stockWeightCode: "100UNCOAT",
  mailClassCode: "Second",
  isDuplex: false,
  isAdmail: false,
  isConfidential: false,
} as const

export class FrankkError extends Error {
  constructor(message: string, readonly submissionUnknown = false, readonly status?: number, readonly operation?: string) {
    super(message)
    this.name = "FrankkError"
  }
}

type JsonRecord = Record<string, unknown>
export interface FrankkCost { currency: string; costPerRecipientPence: number; subtotalPence: number; vatPence: number; totalPence: number }
export interface FrankkStatus { status: string; dispatchedAt?: string; raw: JsonRecord }

export class FrankkClient {
  private token?: string
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {}

  async login() {
    const data = await this.json("/account/login", { method: "POST", body: { ApiKey: this.apiKey }, safe: true, auth: false })
    this.token = requiredString(data, ["token", "accessToken", "access_token"], "Frankk login did not return an access token.")
  }

  async balancePence() {
    const data = await this.json("/account/balance", { method: "POST", body: {}, safe: true })
    const value = numberFrom(data, ["balance", "availableBalance", "amount"])
    if (value === undefined) throw new FrankkError("Frankk did not return an account balance.")
    return moneyToPence(value)
  }

  async createRecipient(input: { companyName: string; address: PostalAddress; workspaceId: string; mailItemId: string; companyNumber: string; suppressionReference: string; recipientKind?: "company_lead" | "manual_test" }) {
    const data = await this.json("/recipients", { method: "POST", body: {
      CompanyName: input.companyName, Address1: input.address.address1, Address2: input.address.address2 ?? "",
      City: input.address.town, CountyName: input.address.county ?? "", Postcode: input.address.postcode,
      CountryName: "United Kingdom", CustomFields: { workspace_id: input.workspaceId, mail_item_id: input.mailItemId, company_number: input.companyNumber, suppression_reference: input.suppressionReference, recipient_kind: input.recipientKind ?? "company_lead" },
    }, mutation: true })
    return requiredString(data, ["recipientId", "id", "recipient_id"], "Frankk did not return a recipient ID.")
  }

  async createCampaign(input: { name: string; recipientId: string; pdf: ArrayBuffer }) {
    const fileName = `${input.name}.pdf`
    const data = await this.json("/campaigns", { method: "POST", body: {
      campaign: { name: input.name, ...FRANKK_LETTER_PRODUCT, recipients: { type: "single", id: input.recipientId } },
      pdf: { fileBase64: Buffer.from(input.pdf).toString("base64"), originalName: fileName, fileName }, templateName: input.name,
    }, mutation: true })
    const campaignId = requiredString(data, ["campaignId", "id", "campaign_id"], "Frankk did not return a campaign ID.")
    const status = requiredString(data, ["status", "currentStatus"], "Frankk did not return a campaign status.")
    if (status.toLowerCase() !== "preview") throw new FrankkError(`Frankk created the campaign in ${status} state instead of Preview.`)
    return campaignId
  }

  async campaignDetails(campaignId: string) { return this.json(`/campaigns/${encodeURIComponent(campaignId)}`, { method: "GET", safe: true }) }
  async preview(campaignId: string) { return this.binary(`/campaigns/${encodeURIComponent(campaignId)}/preview`) }
  async approve(campaignId: string) { return this.json(`/campaigns/approve?campaignId=${encodeURIComponent(campaignId)}`, { method: "POST", body: {}, mutation: true }) }
  async cost(campaignId: string): Promise<FrankkCost> {
    const q = new URLSearchParams({ campaignId, stockWeight: FRANKK_LETTER_PRODUCT.stockWeightCode, mailClass: FRANKK_LETTER_PRODUCT.mailClassCode, isAdMail: String(FRANKK_LETTER_PRODUCT.isAdmail), isConfidential: String(FRANKK_LETTER_PRODUCT.isConfidential), isDuplex: String(FRANKK_LETTER_PRODUCT.isDuplex) })
    const data = await this.json(`/campaigns/cost?${q}`, { method: "POST", body: {}, safe: true })
    const currency = stringFrom(data, ["currencyCode", "currency"])?.toUpperCase()
    const per = numberFrom(data, ["costPerRecipient"]); const subtotal = numberFrom(data, ["subtotal"]); const vat = numberFrom(data, ["vatAmount", "vat"]); const total = numberFrom(data, ["totalCost", "total"])
    if (!currency || per === undefined || subtotal === undefined || total === undefined) throw new FrankkError("Frankk returned an incomplete cost quote.")
    return { currency, costPerRecipientPence: moneyToPence(per), subtotalPence: moneyToPence(subtotal), vatPence: moneyToPence(vat ?? 0), totalPence: moneyToPence(total) }
  }
  async availableDates() {
    const data = await this.json("/campaigns/availableDates", { method: "POST", body: {}, safe: true })
    const values = Array.isArray(data) ? data : valueFrom(data, ["dates", "availableDates"])
    const dates = (Array.isArray(values) ? values : []).map((value) => typeof value === "string" ? value : stringFrom(asRecord(value), ["date", "sendDate"])).filter((value): value is string => Boolean(value))
    if (!dates.length) throw new FrankkError("Frankk did not return an available dispatch date.")
    return dates.sort()[0]
  }
  async schedule(campaignId: string, sendDate: string) {
    const q = new URLSearchParams({ campaignId, send_date: sendDate, next_available_date: "false", use_balance: "true" })
    const data = await this.json(`/campaigns/schedule?${q}`, { method: "POST", body: {}, mutation: true })
    const paymentStatus = stringFrom(data, ["paymentStatus", "payment_status"])
    const returnedId = stringFrom(data, ["campaignId", "campaign_id", "id"])
    if (paymentStatus?.toUpperCase() !== "ACCEPTED" || (returnedId && returnedId !== campaignId)) throw new FrankkError("Frankk did not accept payment for this campaign.")
    return { paymentStatus, orderId: stringFrom(data, ["orderId", "order_id"]), raw: data }
  }
  async status(campaignId: string): Promise<FrankkStatus> {
    const data = await this.json(`/campaigns/statusDetails?campaignId=${encodeURIComponent(campaignId)}`, { method: "POST", body: {}, safe: true })
    const status = requiredString(data, ["currentStatus", "status"], "Frankk did not return a campaign status.")
    const history = valueFrom(data, ["statusHistories", "statusHistory"])
    const dispatched = Array.isArray(history) ? history.map(asRecord).find((row) => stringFrom(row, ["status", "name"])?.toLowerCase().includes("dispatch")) : undefined
    return { status, dispatchedAt: dispatched ? stringFrom(dispatched, ["createdAt", "date", "timestamp"]) : undefined, raw: data }
  }
  async delete(campaignId: string) { return this.json(`/campaigns/delete?campaignId=${encodeURIComponent(campaignId)}`, { method: "POST", body: {}, mutation: true }) }

  private async json(path: string, options: { method: string; body?: unknown; safe?: boolean; mutation?: boolean; auth?: boolean }): Promise<JsonRecord> {
    const response = await this.request(path, options)
    let payload: JsonRecord
    try { payload = await response.json() as JsonRecord } catch { throw new FrankkError(`Frankk returned invalid JSON (${response.status}).`, options.mutation, response.status, path) }
    if (!response.ok) throw new FrankkError(messageFrom(payload) ?? `Frankk request failed (${response.status}).`, options.mutation, response.status, path)
    if (payload.success === false) throw new FrankkError(messageFrom(payload) ?? "Frankk rejected the request.", false, response.status, path)
    const data = payload.data
    if (data === null || data === undefined) throw new FrankkError(messageFrom(payload) ?? "Frankk returned no data for this request.", false, response.status, path)
    return data as JsonRecord
  }

  private async binary(path: string) {
    const response = await this.request(path, { method: "GET", safe: true })
    if (!response.ok) throw new FrankkError(`Frankk preview failed (${response.status}).`, false, response.status)
    const pdf = await response.arrayBuffer()
    if (pdf.byteLength < 5 || new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") throw new FrankkError("Frankk preview response was not a PDF.")
    return pdf
  }

  private async request(path: string, options: { method: string; body?: unknown; safe?: boolean; mutation?: boolean; auth?: boolean }, relogin = true): Promise<Response> {
    if (options.auth !== false && !this.token) await this.login()
    const attempts = options.safe ? MAX_SAFE_ATTEMPTS : 1
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await this.fetcher(`${BASE_URL}${path}`, { method: options.method, headers: { "content-type": "application/json", ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) }, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: AbortSignal.timeout(30_000) })
        if (response.status === 401 && options.auth !== false && relogin) { this.token = undefined; await this.login(); return this.request(path, options, false) }
        if (options.safe && (response.status === 429 || response.status >= 500) && attempt + 1 < attempts) { await delay(retryDelay(response, attempt)); continue }
        return response
      } catch (error) {
        if (options.safe && attempt + 1 < attempts) { await delay(250 * (2 ** attempt)); continue }
        throw new FrankkError(options.mutation ? "Frankk submission result is unknown; manual review is required." : "Frankk is temporarily unavailable.", Boolean(options.mutation))
      }
    }
    throw new FrankkError("Frankk is temporarily unavailable.")
  }
}

function asRecord(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {} }
function valueFrom(row: JsonRecord, keys: string[]) { for (const key of keys) if (row[key] !== undefined) return row[key]; const entries = Object.entries(row); for (const key of keys) { const match = entries.find(([candidate]) => candidate.toLowerCase() === key.toLowerCase()); if (match) return match[1] } return undefined }
function stringFrom(row: JsonRecord, keys: string[]) { const value = valueFrom(row, keys); return typeof value === "string" && value ? value : undefined }
function numberFrom(row: JsonRecord, keys: string[]) { const value = valueFrom(row, keys); const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN; return Number.isFinite(number) ? number : undefined }
function requiredString(row: JsonRecord, keys: string[], message: string) { const value = stringFrom(row, keys); if (!value) throw new FrankkError(message); return value }
function moneyToPence(value: number) { return Math.round(value * 100) }
function messageFrom(row: JsonRecord) { return stringFrom(row, ["message", "error", "detail"]) }
function retryDelay(response: Response, attempt: number) { const seconds = Number(response.headers.get("retry-after")); return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 5000) : 250 * (2 ** attempt) }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)) }
