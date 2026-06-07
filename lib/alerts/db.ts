import type {
  AlertRunCompanyRecord,
  AlertRunRecord,
  AlertSubscriptionRecord,
  CompanyRecord,
  DistributionPoint,
} from "@/lib/types"

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

export async function createOrReplaceAlertRun(
  db: D1Database,
  input: {
    subscriptionId: string
    periodStart: string
    periodEnd: string
    trackedSicCodes: string[]
    companies: Array<CompanyRecord & { matchedAlertCodes: string[] }>
  }
) {
  const existing = await db
    .prepare(
      `SELECT id, access_token
       FROM alert_runs
       WHERE subscription_id = ?1
         AND period_start = ?2
         AND period_end = ?3`
    )
    .bind(input.subscriptionId, input.periodStart, input.periodEnd)
    .first<{ id: string; access_token: string }>()

  const runId = existing?.id ?? crypto.randomUUID()
  const accessToken = existing?.access_token ?? createAccessToken()
  const createdAt = new Date().toISOString()
  const topCities = summarizeTopCities(input.companies)

  const statements = [
    db
      .prepare(
        `INSERT INTO alert_runs (
          id,
          subscription_id,
          period_start,
          period_end,
          match_count,
          tracked_sic_codes_json,
          top_cities_json,
          access_token,
          created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(subscription_id, period_start, period_end) DO UPDATE SET
          match_count = excluded.match_count,
          tracked_sic_codes_json = excluded.tracked_sic_codes_json,
          top_cities_json = excluded.top_cities_json`
      )
      .bind(
        runId,
        input.subscriptionId,
        input.periodStart,
        input.periodEnd,
        input.companies.length,
        JSON.stringify(input.trackedSicCodes),
        JSON.stringify(topCities),
        accessToken,
        createdAt
      ),
    db
      .prepare(`DELETE FROM alert_run_companies WHERE alert_run_id = ?1`)
      .bind(runId),
    ...input.companies.map((company) =>
      db
        .prepare(
          `INSERT INTO alert_run_companies (
            alert_run_id,
            company_number,
            company_name,
            incorporation_date,
            location,
            matched_sic_codes_json,
            created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
        )
        .bind(
          runId,
          company.companyNumber,
          company.companyName,
          company.incorporationDate,
          company.location,
          JSON.stringify(Array.from(new Set(company.matchedAlertCodes)).sort()),
          createdAt
        )
    ),
  ]

  await db.batch(statements)

  return {
    id: runId,
    accessToken,
    topCities,
    matchCount: input.companies.length,
  }
}

export async function getAlertRunByToken(db: D1Database, token: string) {
  const run = await db
    .prepare(
      `SELECT
        id,
        subscription_id,
        period_start,
        period_end,
        match_count,
        tracked_sic_codes_json,
        top_cities_json,
        access_token,
        created_at
      FROM alert_runs
      WHERE access_token = ?1`
    )
    .bind(token)
    .first<{
      id: string
      subscription_id: string
      period_start: string
      period_end: string
      match_count: number
      tracked_sic_codes_json: string
      top_cities_json: string
      access_token: string
      created_at: string
    }>()

  if (!run) {
    return null
  }

  const companies = await db
    .prepare(
      `SELECT
        company_number,
        company_name,
        incorporation_date,
        location,
        matched_sic_codes_json
      FROM alert_run_companies
      WHERE alert_run_id = ?1
      ORDER BY incorporation_date DESC, company_name ASC`
    )
    .bind(run.id)
    .all<{
      company_number: string
      company_name: string
      incorporation_date: string
      location: string
      matched_sic_codes_json: string
    }>()

  return {
    id: run.id,
    subscriptionId: run.subscription_id,
    periodStart: run.period_start,
    periodEnd: run.period_end,
    matchCount: run.match_count,
    trackedSicCodes: safeParseJson<string[]>(run.tracked_sic_codes_json, []),
    topCities: safeParseJson<DistributionPoint[]>(run.top_cities_json, []),
    accessToken: run.access_token,
    createdAt: run.created_at,
    companies: (companies.results ?? []).map((company) => ({
      companyNumber: company.company_number,
      companyName: company.company_name,
      incorporationDate: company.incorporation_date,
      location: company.location,
      matchedSicCodes: safeParseJson<string[]>(company.matched_sic_codes_json, []),
    })),
  } satisfies AlertRunRecord
}

function summarizeTopCities(companies: Array<Pick<CompanyRecord, "location">>) {
  const counts = new Map<string, number>()

  for (const company of companies) {
    const city = company.location.split(",")[0]?.trim() || "Unknown"
    counts.set(city, (counts.get(city) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5)
}

function createAccessToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`
}

function safeParseJson<T>(value: string, fallback: T) {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
