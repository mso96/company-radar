import { SIC_LABELS } from "@/lib/sic-codes"
import type { CompanyRecord } from "@/lib/types"

const EMAIL_COMPANY_PREVIEW_LIMIT = 25

interface SendDailyAlertEmailInput {
  resendApiKey: string
  from: string
  to: string
  trackedSicCodes: string[]
  companies: Array<CompanyRecord & { matchedAlertCodes: string[] }>
  date: string
  idempotencyKey: string
}

export async function sendDailyAlertEmail(input: SendDailyAlertEmailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "uk-company-radar-alerts/1.0",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: `Your UK Company Radar SIC alerts for ${input.date}`,
      html: buildAlertHtml(input),
      text: buildAlertText(input),
      tags: [
        { name: "product", value: "uk-company-radar" },
        { name: "category", value: "sic-alert-digest" },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend email send failed with status ${response.status}: ${body}`)
  }
}

function buildAlertHtml(input: SendDailyAlertEmailInput) {
  const previewCompanies = input.companies.slice(0, EMAIL_COMPANY_PREVIEW_LIMIT)
  const remainingCount = Math.max(input.companies.length - previewCompanies.length, 0)
  const trackedCodes = input.trackedSicCodes
    .map((code) => `<li><strong>${code}</strong> — ${escapeHtml(SIC_LABELS[code] ?? code)}</li>`)
    .join("")
  const topCities = summarizeTopCities(input.companies)

  const companies = previewCompanies
    .map(
      (company) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(company.companyName)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(company.companyNumber)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(company.incorporationDate)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(company.location)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${company.matchedAlertCodes
          .map((code) => `${escapeHtml(code)} — ${escapeHtml(SIC_LABELS[code] ?? code)}`)
          .join("<br />")}</td>
      </tr>`
    )
    .join("")

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">New SIC matches from UK Company Radar</h1>
      <p style="margin: 0 0 16px;">We found <strong>${input.companies.length}</strong> newly incorporated companies on ${escapeHtml(input.date)} for your tracked SIC codes.</p>
      <p style="margin: 0 0 8px;"><strong>Tracked SIC codes</strong></p>
      <ul style="margin: 0 0 20px; padding-left: 18px;">${trackedCodes}</ul>
      <div style="margin: 0 0 20px; border: 1px solid #e5e7eb; background: #f9fafb; padding: 16px;">
        <p style="margin: 0 0 8px;"><strong>Top cities</strong></p>
        <p style="margin: 0; color: #4b5563;">${escapeHtml(topCities)}</p>
      </div>
      <p style="margin: 0 0 12px;"><strong>Showing the first ${previewCompanies.length}</strong> matches from today&apos;s alert.</p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background: #f9fafb; text-align: left;">
            <th style="padding: 12px;">Company</th>
            <th style="padding: 12px;">Number</th>
            <th style="padding: 12px;">Incorporated</th>
            <th style="padding: 12px;">Location</th>
            <th style="padding: 12px;">Matched SIC</th>
          </tr>
        </thead>
        <tbody>${companies}</tbody>
      </table>
      ${
        remainingCount
          ? `<p style="margin: 12px 0 0; color: #6b7280; font-size: 14px;">${remainingCount} more matching companies were not included in this email preview.</p>`
          : ""
      }
    </div>
  `
}

function buildAlertText(input: SendDailyAlertEmailInput) {
  const previewCompanies = input.companies.slice(0, EMAIL_COMPANY_PREVIEW_LIMIT)
  const remainingCount = Math.max(input.companies.length - previewCompanies.length, 0)
  const companyLines = previewCompanies
    .map(
      (company) =>
        `${company.companyName} (${company.companyNumber}) — ${company.incorporationDate} — ${company.location} — ${company.matchedAlertCodes
          .map((code) => `${code} ${SIC_LABELS[code] ?? code}`)
          .join(", ")}`
    )
    .join("\n")

  return [
    `New SIC matches from UK Company Radar for ${input.date}`,
    "",
    `Total matches: ${input.companies.length}`,
    `Tracked SIC codes: ${input.trackedSicCodes.join(", ")}`,
    `Top cities: ${summarizeTopCities(input.companies)}`,
    `Showing first ${previewCompanies.length} matches below`,
    "",
    companyLines,
    ...(remainingCount ? ["", `${remainingCount} more matching companies were not included in this email preview.`] : []),
  ].join("\n")
}

function summarizeTopCities(companies: CompanyRecord[]) {
  const counts = new Map<string, number>()

  for (const company of companies) {
    const city = company.location.split(",")[0]?.trim() || "Unknown"
    counts.set(city, (counts.get(city) ?? 0) + 1)
  }

  const topCities = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([city, count]) => `${city} (${count})`)

  return topCities.length ? topCities.join(", ") : "No city data"
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}
