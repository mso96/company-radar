import { format, subDays } from "date-fns"
import { fetchCompaniesForSicAlerts } from "@/lib/companies-house"
import {
  createOrReplaceAlertRun,
  listActiveAlertSubscriptions,
  markAlertDigestSent,
} from "@/lib/alerts/db"
import { sendWeeklyAlertEmail } from "@/lib/alerts/email"
import type { AlertsRuntimeEnv } from "@/lib/alerts/runtime"
import { requireAlertsDatabase, requireEnvValue } from "@/lib/alerts/runtime"
import type { CompanyRecord } from "@/lib/types"

export async function runWeeklyAlertDigest(
  env: AlertsRuntimeEnv,
  targetEndDate = format(subDays(new Date(), 1), "yyyy-MM-dd"),
  targetStartDate = format(subDays(new Date(targetEndDate), 6), "yyyy-MM-dd")
) {
  const db = requireAlertsDatabase(env)
  const resendApiKey = requireEnvValue(env.RESEND_API_KEY, "RESEND_API_KEY")
  const from = requireEnvValue(env.ALERT_FROM_EMAIL, "ALERT_FROM_EMAIL")
  const siteUrl = (env.SITE_URL ?? "https://companyradar.uk").replace(/\/$/, "")
  const companiesHouseApiKey = requireEnvValue(
    env.COMPANIES_HOUSE_API_KEY,
    "COMPANIES_HOUSE_API_KEY"
  )

  const subscriptions = await listActiveAlertSubscriptions(db)
  if (subscriptions.length === 0) {
    return { processed: 0, sent: 0, targetStartDate, targetEndDate }
  }

  const uniqueSicCodes = Array.from(
    new Set(subscriptions.flatMap((subscription) => subscription.sicCodes))
  )

  const companiesBySic = new Map<string, CompanyRecord[]>()
  for (const sicCode of uniqueSicCodes) {
    companiesBySic.set(
      sicCode,
      await fetchCompaniesForSicAlerts(
        companiesHouseApiKey,
        targetStartDate,
        targetEndDate,
        sicCode
      )
    )
  }

  let sent = 0

  for (const subscription of subscriptions) {
    const companyMap = new Map<
      string,
      CompanyRecord & { matchedAlertCodes: string[] }
    >()

    for (const sicCode of subscription.sicCodes) {
      const companies = companiesBySic.get(sicCode) ?? []
      for (const company of companies) {
        const existing = companyMap.get(company.companyNumber)
        if (existing) {
          existing.matchedAlertCodes.push(sicCode)
          continue
        }

        companyMap.set(company.companyNumber, {
          ...company,
          matchedAlertCodes: [sicCode],
        })
      }
    }

    const matches = Array.from(companyMap.values()).sort((left, right) =>
      left.companyName.localeCompare(right.companyName)
    )

    if (matches.length === 0) {
      continue
    }

    const alertRun = await createOrReplaceAlertRun(db, {
      subscriptionId: subscription.id,
      periodStart: targetStartDate,
      periodEnd: targetEndDate,
      trackedSicCodes: subscription.sicCodes,
      companies: matches,
    })

    await sendWeeklyAlertEmail({
      resendApiKey,
      from,
      to: subscription.email,
      trackedSicCodes: subscription.sicCodes,
      companies: matches,
      startDate: targetStartDate,
      endDate: targetEndDate,
      resultsUrl: `${siteUrl}/alerts/results/${alertRun.accessToken}`,
      idempotencyKey: `${subscription.id}:${targetStartDate}:${targetEndDate}`,
    })

    await markAlertDigestSent(db, subscription.id, new Date().toISOString())
    sent += 1
  }

  return { processed: subscriptions.length, sent, targetStartDate, targetEndDate }
}
