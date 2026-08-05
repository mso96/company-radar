import type { LetterBlock, LetterLayout } from "@/lib/agency/types"

export const requiredBlockTypes = ["brand", "recipient", "footer"] as const

export function defaultLetterLayout(input?: { subject?: string; bodyHtml?: string; ctaText?: string; ctaUrl?: string; signature?: string }): LetterLayout {
  const paragraphs = htmlToTextBlocks(input?.bodyHtml ?? "Hello {{company_name}},")
  return { version: 1, blocks: [
    block("brand"), block("recipient"),
    block("heading", input?.subject ?? "A quick idea for {{company_name}}"),
    ...paragraphs,
    ...(input?.ctaText ? [{ ...block("cta", input.ctaText), url: input.ctaUrl ?? "" }] : []),
    block("signature", input?.signature ?? "Your team"), block("footer"),
  ] }
}

export function normalizeLetterLayout(value: unknown, legacy?: Parameters<typeof defaultLetterLayout>[0]): LetterLayout {
  if (!value || typeof value !== "object") return defaultLetterLayout(legacy)
  const candidate = value as { version?: unknown; blocks?: unknown }
  if (!Array.isArray(candidate.blocks)) return defaultLetterLayout(legacy)
  const blocks = candidate.blocks.map(normalizeBlock).filter((item): item is LetterBlock => Boolean(item)).slice(0, 60)
  for (const type of requiredBlockTypes) if (!blocks.some((item) => item.type === type)) blocks.push(block(type))
  return { version: 1, blocks }
}

export function block(type: LetterBlock["type"], content = ""): LetterBlock { return { id: crypto.randomUUID(), type, content, align: "left" } }

function normalizeBlock(value: unknown): LetterBlock | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<LetterBlock>
  const allowed: LetterBlock["type"][] = ["brand", "recipient", "heading", "paragraph", "list", "image", "cta", "qr", "signature", "divider", "spacer", "footer"]
  if (!item.type || !allowed.includes(item.type)) return null
  return { id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(), type: item.type, content: cleanText(item.content, 5000), items: Array.isArray(item.items) ? item.items.map((entry) => cleanText(entry, 500)).filter(Boolean).slice(0, 20) : undefined, url: cleanText(item.url, 2000), alt: cleanText(item.alt, 300), align: ["left", "center", "right"].includes(item.align ?? "") ? item.align : "left" }
}

function htmlToTextBlocks(html: string): LetterBlock[] {
  const normalized = html.replace(/<li[^>]*>/gi, "• ").replace(/<\/(p|li|div|h\d)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
  return normalized.split(/\n+/).map((line) => decode(line).trim()).filter(Boolean).map((line) => block(line.startsWith("• ") ? "list" : "paragraph", line.replace(/^•\s*/, "")))
}

function decode(value: string) { return value.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") }
function cleanText(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : "" }
