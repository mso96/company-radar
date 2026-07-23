import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Radar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { SECTOR_LANDING_PAGES } from "@/lib/sector-landing-pages"

export const metadata: Metadata = {
  title: "Sector radars | UK Company Radar",
  description: "Explore live UK company intelligence for AI, digital agencies, property and ecommerce sectors.",
  alternates: { canonical: "/sectors" },
  openGraph: { title: "Sector radars | UK Company Radar", description: "Explore live UK company intelligence by sector.", type: "website", url: "/sectors" },
}

export default function SectorsPage() {
  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 lg:px-8"><MarketingHeader /><section className="border-2 bg-card px-5 py-8 shadow-[6px_6px_0_0_hsl(var(--foreground))] sm:px-8"><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground"><Radar className="size-4" /> Sector radars</div><h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.96] sm:text-6xl">Find your next market before it becomes crowded.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Open a live UK company preview for the sector your team serves, then turn it into an Agency Mode radar when you are ready.</p></section><section className="grid gap-4 md:grid-cols-2">{SECTOR_LANDING_PAGES.map((sector) => <Card key={sector.slug} className="flex flex-col"><CardHeader><CardTitle className="text-2xl">{sector.sector}</CardTitle><CardDescription>{sector.description}</CardDescription></CardHeader><CardContent className="mt-auto"><div className="mb-5 flex flex-wrap gap-2">{sector.sicCodes.map((code) => <Badge key={code} variant="outline" className="border-2">{code}</Badge>)}</div><Button asChild><Link href={`/${sector.slug}`}>Open {sector.sector} radar <ArrowRight className="size-4" /></Link></Button></CardContent></Card>)}</section></div></main>
}
