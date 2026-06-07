import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AlertResultsNotFound() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="mb-3 flex size-12 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-4))] shadow-[3px_3px_0_0_hsl(var(--foreground))]">
              <AlertCircle className="size-6" />
            </div>
            <CardTitle>Alert results not found</CardTitle>
            <CardDescription>
              This private results link is invalid or no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
