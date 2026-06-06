import { SIC_LABELS } from "@/lib/sic-codes"
import type { AlertCheckoutInput } from "@/lib/types"
import { ALERT_MAX_SIC_CODES } from "@/lib/alerts/constants"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateAlertCheckoutInput(input: AlertCheckoutInput) {
  const email = input.email.trim().toLowerCase()
  const sicCodes = Array.from(
    new Set(input.sicCodes.map((code) => code.trim()).filter(Boolean))
  )

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Please enter a valid email address.")
  }

  if (sicCodes.length === 0) {
    throw new Error("Select at least one SIC code to track.")
  }

  if (sicCodes.length > ALERT_MAX_SIC_CODES) {
    throw new Error(`Choose up to ${ALERT_MAX_SIC_CODES} SIC codes per alert.`)
  }

  for (const sicCode of sicCodes) {
    if (!SIC_LABELS[sicCode]) {
      throw new Error(`Unsupported SIC code: ${sicCode}`)
    }
  }

  return { email, sicCodes }
}
