import Link from "next/link"
import { Radar } from "lucide-react"

export function MarketingHeader() {
  return (
    <header className="flex flex-col gap-4 border-2 bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))] sm:flex-row sm:items-center sm:justify-between">
      <Link className="flex items-center gap-2 text-sm font-black uppercase tracking-wide" href="/">
        <span className="flex size-8 items-center justify-center border-2 bg-[hsl(var(--chart-2))]">
          <Radar className="size-4" />
        </span>
        UK Company Radar
      </Link>
      <nav aria-label="Marketing navigation" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
        <Link className="underline-offset-4 hover:underline" href="/agency">Agency Mode</Link>
        <Link className="underline-offset-4 hover:underline" href="/sectors">Sectors</Link>
        <Link className="underline-offset-4 hover:underline" href="/pricing">Pricing</Link>
        <Link className="underline-offset-4 hover:underline" href="/contact">Contact Us</Link>
      </nav>
    </header>
  )
}
