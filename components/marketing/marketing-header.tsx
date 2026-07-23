import Link from "next/link"
import { Radar } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="flex flex-col gap-4 border-2 bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))] sm:flex-row sm:items-center sm:justify-between">
      <Link className="flex items-center gap-2 text-sm font-black uppercase tracking-wide" href="/">
        <span className="flex size-8 items-center justify-center border-2 bg-[hsl(var(--chart-2))]">
          <Radar className="size-4" />
        </span>
        UK Company Radar
      </Link>
      <nav aria-label="Marketing navigation" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <Button asChild className="border-2 bg-[hsl(var(--chart-2))] px-3 py-2 text-xs font-black text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:bg-[hsl(var(--chart-2))]/90">
          <Link href="/agency">Agency Mode <span aria-hidden="true">→</span></Link>
        </Button>
        <Link className="px-2 underline-offset-4 hover:underline" href="/pricing">Pricing</Link>
        <Link className="px-2 underline-offset-4 hover:underline" href="/contact">Contact Us</Link>
      </nav>
    </header>
  )
}
