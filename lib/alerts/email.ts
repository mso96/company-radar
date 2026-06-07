import { SIC_LABELS } from "@/lib/sic-codes"
import type { CompanyRecord } from "@/lib/types"

const EMAIL_COMPANY_PREVIEW_LIMIT = 25

interface SendDailyAlertEmailInput {
  resendApiKey: string
  from: string
  to: string
  trackedSicCodes: string[]
  companies: Array<CompanyRecord & { matchedAlertCodes: string[] }>
  startDate: string
  endDate: string
  resultsUrl: string
  idempotencyKey: string
}

export async function sendWeeklyAlertEmail(input: SendDailyAlertEmailInput) {
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
      subject: `Your weekly UK Company Radar alert: ${input.startDate} to ${input.endDate}`,
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

export async function sendWelcomeAlertEmail(input: {
  resendApiKey: string
  from: string
  to: string
  trackedSicCodes: string[]
  idempotencyKey: string
}) {
  const trackedCodes = input.trackedSicCodes
    .map((code) => `${code} - ${SIC_LABELS[code] ?? code}`)
    .join("\n")

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
      subject: "You’re in — your UK Company Radar alerts are live",
      html: `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>UK Company Radar</title>
          </head>
          <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:2px solid #111111;">
                    <tr>
                      <td style="padding:24px 24px 12px 24px;">
                        <div style="display:inline-block;padding:10px 14px;border:2px solid #111111;background:#d7ff2f;font-weight:800;font-size:12px;letter-spacing:.04em;text-transform:uppercase;">
                          UK Company Radar
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 24px 12px 24px;">
                        <h1 style="margin:0;font-size:34px;line-height:1.05;font-weight:900;color:#111827;">
                          Payment received. <br />Your SIC alerts are live.
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 24px 20px 24px;">
                        <p style="margin:0;font-size:17px;line-height:1.7;color:#4b5563;">
                          Thanks for subscribing to <strong style="color:#111827;">UK Company Radar</strong>.
                          We’ll send you a weekly roundup of newly incorporated UK companies matching your selected SIC codes.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 24px 20px 24px;">
                        <div style="border:2px solid #111111;background:#fafafa;padding:16px;">
                          <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#6b7280;">
                            Tracked SIC codes
                          </p>
                          <div style="font-size:15px;line-height:1.8;color:#111827;white-space:pre-line;">
                            ${escapeHtml(trackedCodes)}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 24px 20px 24px;">
                        <div style="border:2px solid #111111;background:#fff7cc;padding:16px;">
                          <p style="margin:0;font-size:15px;line-height:1.7;color:#111827;">
                            Your first roundup will arrive on the next weekly alert run if we find matching companies.
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 24px 28px 24px;">
                        <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">
                          Built by <strong style="color:#111827;">Sefa Oruc</strong> · UK Company Radar
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: [
        "Payment received. Your UK Company Radar SIC alerts are live.",
        "",
        "Tracked SIC codes:",
        trackedCodes,
        "",
        "We’ll send your weekly digest on the next alert run when matching companies are found.",
      ].join("\n"),
      tags: [
        { name: "product", value: "uk-company-radar" },
        { name: "category", value: "sic-alert-welcome" },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend welcome email failed with status ${response.status}: ${body}`)
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
      <h1 style="font-size: 24px; margin-bottom: 8px;">Your weekly SIC matches from UK Company Radar</h1>
      <p style="margin: 0 0 16px;">We found <strong>${input.companies.length}</strong> newly incorporated companies between ${escapeHtml(input.startDate)} and ${escapeHtml(input.endDate)} for your tracked SIC codes.</p>
      <p style="margin: 0 0 8px;"><strong>Tracked SIC codes</strong></p>
      <ul style="margin: 0 0 20px; padding-left: 18px;">${trackedCodes}</ul>
      <div style="margin: 0 0 20px; border: 1px solid #e5e7eb; background: #f9fafb; padding: 16px;">
        <p style="margin: 0 0 8px;"><strong>Top cities</strong></p>
        <p style="margin: 0; color: #4b5563;">${escapeHtml(topCities)}</p>
      </div>
      <p style="margin: 0 0 12px;"><strong>Showing the first ${previewCompanies.length}</strong> matches from this week&apos;s alert.</p>
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
      <div style="margin: 20px 0 0;">
        <a
          href="${escapeHtml(input.resultsUrl)}"
          style="display: inline-block; padding: 12px 18px; background: #d7ff2f; border: 2px solid #111827; color: #111827; text-decoration: none; font-weight: 700;"
        >
          View all matches
        </a>
      </div>
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
    `Your weekly UK Company Radar SIC alert for ${input.startDate} to ${input.endDate}`,
    "",
    `Total matches: ${input.companies.length}`,
    `Tracked SIC codes: ${input.trackedSicCodes.join(", ")}`,
    `Top cities: ${summarizeTopCities(input.companies)}`,
    `Showing first ${previewCompanies.length} matches below`,
    `View all matches: ${input.resultsUrl}`,
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
