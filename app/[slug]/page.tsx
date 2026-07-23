import type { Metadata } from "next"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { ArrowRight, Building2, Radar, Tags } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { fetchCompaniesForSicAlerts } from "@/lib/companies-house"
import { getSectorLandingPage, labelsForSicCodes, LEGACY_SECTOR_SLUGS, SECTOR_LANDING_PAGES } from "@/lib/sector-landing-pages"

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return SECTOR_LANDING_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getSectorLandingPage((await params).slug)
  if (!page) return {}
  const canonical = `/${page.slug}`
  return {
    title: `${page.title} | UK Company Radar`,
    description: page.description,
    alternates: { canonical },
    openGraph: { title: page.title, description: page.description, type: "website", url: canonical },
  }
}

export default async function SectorLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const legacyDestination = LEGACY_SECTOR_SLUGS[slug]
  if (legacyDestination) permanentRedirect(`/${legacyDestination}`)

  const page = getSectorLandingPage(slug)
  if (!page) notFound()

  const date = new Date().toISOString().slice(0, 10)
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  const companies = apiKey
    ? (await Promise.all(page.sicCodes.map((sicCode) => fetchCompaniesForSicAlerts(apiKey, date, date, sicCode))))
        .flat()
        .filter((company, index, all) => all.findIndex((candidate) => candidate.companyNumber === company.companyNumber) === index)
        .slice(0, 12)
    : []
  const keywordMatchCount = companies.filter((company) => page.keywords.some((keyword) => company.companyName.toLowerCase().includes(keyword.toLowerCase()))).length
  const faq = [
    { q: `What counts as a new ${page.sector} company?`, a: `Companies newly incorporated today that match the selected Companies House SIC categories for ${page.sector}.` },
    { q: "Is this a complete market list?", a: "No. Companies House data is queried in an API-limited sample, so this page is an early-signal discovery tool rather than a market census." },
    { q: "Can I receive these automatically?", a: "Agency Mode lets teams save a radar, receive daily lead alerts and export matching companies to a CRM." },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-7 sm:px-6 lg:px-8">
        <MarketingHeader />
        <header className="border-2 bg-card px-5 py-7 shadow-[6px_6px_0_0_hsl(var(--foreground))] sm:px-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground"><Radar className="size-4" /> Sector radar</div>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.98] sm:text-5xl">{page.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{page.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">{labelsForSicCodes(page.sicCodes).map((label) => <Badge key={label} variant="outline" className="border-2">{label}</Badge>)}</div>
          <div className="mt-6"><Button asChild><Link href="/agency-login">Get this radar daily <ArrowRight className="ml-2 size-4" /></Link></Button></div>
        </header>
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Building2 />} label="Today’s public preview" value={companies.length} />
          <Stat icon={<Tags />} label="Tracked SIC codes" value={page.sicCodes.length} />
          <Stat icon={<Radar />} label="For who" value={page.persona} />
        </section>
        <Card>
          <CardHeader><CardTitle>Fresh company preview</CardTitle><CardDescription>Companies House data; listed for discovery, not as a complete market census.</CardDescription></CardHeader>
          <CardContent>{companies.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b-2 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Company</th><th className="p-3">Incorporated</th><th className="p-3">Location</th><th className="p-3">SIC</th></tr></thead><tbody>{companies.map((company) => <tr key={company.companyNumber} className="border-b"><td className="p-3 font-bold">{company.companyName}<p className="mt-1 text-xs text-muted-foreground">{company.companyNumber}</p></td><td className="p-3">{company.incorporationDate}</td><td className="p-3">{company.location}</td><td className="p-3">{company.sicCodes.join(", ")}</td></tr>)}</tbody></table></div> : <p className="border-2 border-dashed p-4 text-sm text-muted-foreground">Live preview needs a Companies House API key. Agency Mode can still be configured for daily delivery once production secrets are connected.</p>}</CardContent>
        </Card>
        <section className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-lg">Built for {page.persona}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{page.personaDescription}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">Keyword signals</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{page.keywords.join(", ")}. {companies.length ? `${keywordMatchCount} preview companies include at least one signal.` : "Available when live preview data is connected."}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">Agency delivery</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Save this sector as a radar, get daily matches and send leads to your CRM via webhook or CSV.</p></CardContent></Card>
        </section>
        <section className="grid gap-4 md:grid-cols-3">{faq.map((item) => <Card key={item.q}><CardHeader><CardTitle className="text-lg">{item.q}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{item.a}</p></CardContent></Card>)}</section>
        <footer className="py-4 text-center text-sm text-muted-foreground"><Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/agency">Explore Agency Intelligence</Link></footer>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) }) }} />
      </div>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <Card><CardContent className="flex items-center gap-3 p-5"><div className="flex size-9 items-center justify-center border-2 bg-[hsl(var(--chart-3))]">{icon}</div><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div></CardContent></Card>
}
