import type { AgencyRadar } from "@/lib/agency/types"

export async function sendMagicLinkEmail(input: { resendApiKey: string; from: string; to: string; url: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.resendApiKey}`, "Content-Type": "application/json", "User-Agent": "company-radar-agency/1.0" },
    body: JSON.stringify({ from: input.from, to: [input.to], subject: "Your UK Company Radar sign-in link", html: `<p>Use this secure link to open your Agency Radar workspace:</p><p><a href="${escapeHtml(input.url)}">Open Agency Radar</a></p><p>This link expires in 15 minutes.</p>`, text: `Open Agency Radar: ${input.url}\n\nThis link expires in 15 minutes.`, tags: [{ name: "product", value: "uk-company-radar" }, { name: "category", value: "magic-link" }] }),
  })
  if (!response.ok) throw new Error(`Resend magic-link email failed with status ${response.status}.`)
}

export async function sendAgencyDigestEmail(input: { resendApiKey: string; from: string; to: string; siteUrl: string; radar: AgencyRadar; leadCount: number; eventCount: number }) {
  if (input.leadCount + input.eventCount === 0) return
  const url = `${input.siteUrl.replace(/\/$/, "")}/app`
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.resendApiKey}`, "Content-Type": "application/json", "User-Agent": "company-radar-agency/1.0", "Idempotency-Key": `${input.radar.id}:${new Date().toISOString().slice(0, 10)}` },
    body: JSON.stringify({ from: input.from, to: [input.to], subject: `${input.radar.name}: ${input.leadCount} new leads, ${input.eventCount} company events`, html: `<h1>${escapeHtml(input.radar.name)}</h1><p>Today’s Agency Radar summary:</p><ul><li><strong>${input.leadCount}</strong> new lead${input.leadCount === 1 ? "" : "s"}</li><li><strong>${input.eventCount}</strong> tracked company event${input.eventCount === 1 ? "" : "s"}</li></ul><p><a href="${escapeHtml(url)}">Open your lead inbox</a></p>`, text: `${input.radar.name}\n${input.leadCount} new leads\n${input.eventCount} company events\n${url}`, tags: [{ name: "product", value: "uk-company-radar" }, { name: "category", value: "agency-digest" }] }),
  })
  if (!response.ok) throw new Error(`Resend agency digest failed with status ${response.status}.`)
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character) }
