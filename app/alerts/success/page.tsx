import Link from "next/link"
import { CheckCircle2, Mail, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AlertSuccessPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-2))] shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <Radar className="size-7" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              UK Company Radar
            </p>
            <h1 className="text-3xl font-black tracking-normal sm:text-4xl">
              Your SIC alerts are live
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-3 flex size-12 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-1))] shadow-[3px_3px_0_0_hsl(var(--foreground))]">
              <CheckCircle2 className="size-6" />
            </div>
            <CardTitle>Payment completed successfully</CardTitle>
            <CardDescription>
              We will start watching your selected SIC codes and send your first digest in the next
              weekly alert run.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border-2 bg-muted/40 p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Alert emails only go out when we find newly incorporated matching companies for
                  your tracked SIC codes.
                </p>
              </div>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
