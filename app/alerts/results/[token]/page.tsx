import { Radar } from "lucide-react"
import { notFound } from "next/navigation"
import { AlertResultsView } from "@/components/alerts/alert-results-view"
import { getAlertRunByToken } from "@/lib/alerts/db"
import { getAlertsRuntimeEnv, requireAlertsDatabase } from "@/lib/alerts/runtime"

export default async function AlertResultsPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const env = await getAlertsRuntimeEnv()
  const db = requireAlertsDatabase(env)
  const run = await getAlertRunByToken(db, token)

  if (!run) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-2))] shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <Radar className="size-7" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              UK Company Radar
            </p>
            <h1 className="text-3xl font-black tracking-normal sm:text-4xl">
              Results for {run.periodStart} to {run.periodEnd}
            </h1>
          </div>
        </div>

        <AlertResultsView run={run} />
      </div>
    </main>
  )
}
