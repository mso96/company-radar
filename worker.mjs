// @ts-expect-error generated after `npm run build`
import appWorker from "./.open-next/worker.js"
import { runWeeklyAlertDigest } from "./lib/alerts/digest"

export default {
  async fetch(request, env, ctx) {
    return appWorker.fetch(request, env, ctx)
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runWeeklyAlertDigest(env))
  },
}
