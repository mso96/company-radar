import { claimPendingWebhookDeliveries, recordWebhookAttempt } from "@/lib/agency/db"

export async function deliverPendingWebhooks(db: D1Database) {
  const deliveries = await claimPendingWebhookDeliveries(db)
  let delivered = 0
  for (const delivery of deliveries) {
    const payload = delivery.payload_json
    try {
      const signature = await signPayload(delivery.secret, payload)
      const response = await fetch(delivery.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "company-radar-webhooks/1.0",
          "X-Company-Radar-Event": delivery.event_name,
          "X-Company-Radar-Signature": `sha256=${signature}`,
        },
        body: payload,
      })
      await recordWebhookAttempt(db, delivery.id, { status: response.status, error: response.ok ? undefined : (await response.text()).slice(0, 500) })
      if (response.ok) delivered += 1
    } catch (error) {
      await recordWebhookAttempt(db, delivery.id, { error: error instanceof Error ? error.message : "Webhook delivery failed." })
    }
  }
  return { processed: deliveries.length, delivered }
}

export async function signPayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
