import { SIC_LABELS } from "@/lib/sic-codes"

export async function sendTelegramSubscriberNotification(input: {
  botToken?: string
  chatId?: string
  email: string
  sicCodes: string[]
  stripeSubscriptionId: string
}) {
  if (!input.botToken || !input.chatId) {
    return
  }

  const codes = input.sicCodes
    .map((code) => `- ${code}: ${SIC_LABELS[code] ?? code}`)
    .join("\n")

  const text = [
    "New UK Company Radar subscriber",
    "",
    `Email: ${input.email}`,
    `Subscription: ${input.stripeSubscriptionId}`,
    "",
    "Tracked SIC codes:",
    codes,
  ].join("\n")

  const response = await fetch(
    `https://api.telegram.org/bot${input.botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: input.chatId,
        text,
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Telegram notification failed with status ${response.status}: ${body}`)
  }
}
