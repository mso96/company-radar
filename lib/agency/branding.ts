export const DEFAULT_ACCENT_COLOR = "#c6ff00"

export function normalizeAccentColor(value: string | null | undefined) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : DEFAULT_ACCENT_COLOR
}

export function normalizeExternalUrl(value: string | null | undefined) {
  const candidate = value?.trim()
  if (!candidate) return undefined
  try {
    const url = new URL(candidate)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}
