// @ts-expect-error generated after `npm run build`
import appWorker from "./.open-next/worker.js"
import { runAgencyDailyScan } from "./lib/agency/scanner"
import { syncStannpMailStatuses } from "./lib/agency/mail"
import { sunsetLegacyAlertSubscriptions } from "./lib/alerts/sunset"

export default {
  async fetch(request, env, ctx) {
    return appWorker.fetch(request, env, ctx)
  },
  async scheduled(controller, env, ctx) {
    if (controller.cron === "0 8 * * *") { ctx.waitUntil(runAgencyDailyScan(env.ALERTS_DB, env.COMPANIES_HOUSE_API_KEY)); ctx.waitUntil(sunsetLegacyAlertSubscriptions(env)) }
    if (controller.cron === "*/30 * * * *" && env.STANNP_API_KEY) ctx.waitUntil(syncStannpMailStatuses(env.ALERTS_DB, env.STANNP_API_KEY))
  },
}
