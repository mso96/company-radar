import type { AlertSubscriptionRecord } from "@/lib/types"

interface UpsertAlertSubscriptionInput {
  email: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: string
  sicCodes: string[]
}

export async function upsertAlertSubscription(
  db: D1Database,
  input: UpsertAlertSubscriptionInput
) {
  const now = new Date().toISOString()
  const existing = await db
    .prepare(
      `SELECT id, created_at, last_alert_sent_at
       FROM alert_subscriptions
       WHERE stripe_subscription_id = ?1`
    )
    .bind(input.stripeSubscriptionId)
    .first<{
      id: string
      created_at: string
      last_alert_sent_at: string | null
    }>()

  const subscriptionId = existing?.id ?? crypto.randomUUID()

  const statements = [
    db
      .prepare(
        `INSERT INTO alert_subscriptions (
          id,
          email,
          stripe_customer_id,
          stripe_subscription_id,
          status,
          created_at,
          updated_at,
          last_alert_sent_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(stripe_subscription_id) DO UPDATE SET
          email = excluded.email,
          stripe_customer_id = excluded.stripe_customer_id,
          status = excluded.status,
          updated_at = excluded.updated_at`
      )
      .bind(
        subscriptionId,
        input.email,
        input.stripeCustomerId,
        input.stripeSubscriptionId,
        input.status,
        existing?.created_at ?? now,
        now,
        existing?.last_alert_sent_at ?? null
      ),
    db
      .prepare(`DELETE FROM alert_subscription_sic_codes WHERE subscription_id = ?1`)
      .bind(subscriptionId),
    ...input.sicCodes.map((sicCode) =>
      db
        .prepare(
          `INSERT INTO alert_subscription_sic_codes (
            subscription_id,
            sic_code,
            created_at
          ) VALUES (?1, ?2, ?3)`
        )
        .bind(subscriptionId, sicCode, now)
    ),
  ]

  await db.batch(statements)
  return subscriptionId
}

export async function updateAlertSubscriptionStatus(
  db: D1Database,
  stripeSubscriptionId: string,
  status: string
) {
  await db
    .prepare(
      `UPDATE alert_subscriptions
       SET status = ?1, updated_at = ?2
       WHERE stripe_subscription_id = ?3`
    )
    .bind(status, new Date().toISOString(), stripeSubscriptionId)
    .run()
}

export async function listActiveAlertSubscriptions(db: D1Database) {
  const rows = await db
    .prepare(
      `SELECT
        s.id,
        s.email,
        s.stripe_customer_id,
        s.stripe_subscription_id,
        s.status,
        s.created_at,
        s.updated_at,
        s.last_alert_sent_at,
        c.sic_code
      FROM alert_subscriptions s
      LEFT JOIN alert_subscription_sic_codes c
        ON c.subscription_id = s.id
      WHERE s.status IN ('active', 'trialing')
      ORDER BY s.created_at DESC, c.sic_code ASC`
    )
    .all<{
      id: string
      email: string
      stripe_customer_id: string
      stripe_subscription_id: string
      status: string
      created_at: string
      updated_at: string
      last_alert_sent_at: string | null
      sic_code: string | null
    }>()

  const subscriptions = new Map<string, AlertSubscriptionRecord>()

  for (const row of rows.results ?? []) {
    const existing = subscriptions.get(row.id)
    if (existing) {
      if (row.sic_code) {
        existing.sicCodes.push(row.sic_code)
      }
      continue
    }

    subscriptions.set(row.id, {
      id: row.id,
      email: row.email,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      status: row.status,
      sicCodes: row.sic_code ? [row.sic_code] : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAlertSentAt: row.last_alert_sent_at,
    })
  }

  return Array.from(subscriptions.values())
}

export async function markAlertDigestSent(
  db: D1Database,
  subscriptionId: string,
  sentAt: string
) {
  await db
    .prepare(
      `UPDATE alert_subscriptions
       SET last_alert_sent_at = ?1, updated_at = ?1
       WHERE id = ?2`
    )
    .bind(sentAt, subscriptionId)
    .run()
}
