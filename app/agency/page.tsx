import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Building2, Calculator, Check, Mail, Search, ShoppingBag, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { SECTOR_LANDING_PAGES } from "@/lib/sector-landing-pages"

export const metadata: Metadata = {
  title: "Agency Intelligence | UK Company Radar",
  description: "New company leads, competitor signals and CRM-ready radar delivery for commercial service teams.",
  alternates: { canonical: "/agency" },
}

const audiences = [
  { name: "Digital agencies", description: "Find new businesses before their first website, rebrand or growth brief.", href: "/new-ai-companies", action: "Explore AI & software radar", icon: Sparkles },
  { name: "Property services", description: "Follow fresh property businesses for finance, insurance and service opportunities.", href: "/new-property-companies", action: "Explore property radar", icon: Building2 },
  { name: "Ecommerce services", description: "Spot new merchants early for store builds, fulfilment and paid media support.", href: "/new-ecommerce-companies", action: "Explore ecommerce radar", icon: ShoppingBag },
  { name: "Accounting firms", description: "Reach newly formed companies before their first filing and advisory decisions.", href: "/contact", action: "Talk about accounting leads", icon: Calculator },
]

export default function AgencyMarketingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 lg:px-8">
        <MarketingHeader />

        <section className="overflow-hidden border-2 bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))]">
          <div className="grid gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:py-12">
            <div>
              <Badge className="border-2" variant="outline">Agency Mode · free workspace</Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[.96] sm:text-6xl">Find new companies. Reach them first.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Choose the SIC codes and locations you sell into. We surface newly incorporated companies, help you personalise the letter, and keep every physical send behind your approval.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link href="/agency-login">Start with Agency Mode <ArrowRight className="size-4" /></Link></Button>
                <Link className="inline-flex items-center px-2 text-sm font-bold underline-offset-4 hover:underline" href="#how-it-works">See how it works</Link>
              </div>
            </div>
            <div className="border-2 bg-background p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">The simple loop</p>
              <div className="mt-3 space-y-3">
                <HeroStep number="01" icon={Search} title="Choose your audience" text="Pick a ready-made segment or set your own SIC and location rules." />
                <HeroStep number="02" icon={Mail} title="Make the letter yours" text="Start from a proven template, then edit the message, CTA and branding." />
                <HeroStep number="03" icon={Check} title="Review before sending" text="New leads enter your queue. You approve every batch before postage." />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 border-t-2"><div className="h-3 bg-[hsl(var(--chart-1))]" /><div className="h-3 bg-[hsl(var(--chart-2))]" /><div className="h-3 bg-[hsl(var(--chart-3))]" /><div className="h-3 bg-[hsl(var(--chart-4))]" /></div>
        </section>

        <section id="for-who" className="scroll-mt-6">
          <div className="mb-4"><p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">For who</p><h2 className="mt-1 text-3xl font-black">Built for teams selling into new businesses.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Start with the audience closest to your offer. You can change the filters and letter before activating a radar.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {audiences.map(({ name, description, href, action, icon: Icon }) => <Card key={name}><CardHeader><div className="mb-2 flex size-10 items-center justify-center border-2 bg-[hsl(var(--chart-3))]"><Icon className="size-5" /></div><CardTitle>{name}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={href}>{action} <ArrowRight className="size-4" /></Link></Button></CardContent></Card>)}
          </div>
        </section>

        <section className="scroll-mt-6" aria-labelledby="example-letter-heading">
          <div className="mb-4">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Example letter</p>
            <h2 id="example-letter-heading" className="mt-1 text-3xl font-black">A letter your new-company campaign can send.</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Start with a ready-made message, then make it yours with your services, branding and call to action before you approve a batch.
            </p>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
              <div className="order-last flex w-full flex-col justify-center gap-4 border-t-2 pt-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit border-2" variant="outline">Digital agencies · New company introduction</Badge>
                  <Badge className="w-fit border-2 bg-[hsl(var(--chart-2))]" variant="outline">Letters from 99p</Badge>
                </div>
                <h3 className="text-2xl font-black">Show the recipient what you can help them do next.</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Every field can be customised in Agency Mode. Choose the audience, select your services, add your logo and preview the exact letter before it goes to approval.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Website launch', 'Branding', 'SEO', 'Paid media'].map((service) => (
                    <Badge key={service} variant="secondary">{service}</Badge>
                  ))}
                </div>
                <Button asChild className="w-fit" size="lg">
                  <Link href="/agency-login">Create your letter <ArrowRight className="size-4" /></Link>
                </Button>
              </div>
              <article className="order-first w-full overflow-hidden border-2 bg-white text-black shadow-[5px_5px_0_0_hsl(var(--foreground))]" aria-label="Example direct mail letter">
                <div className="bg-black px-5 py-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white sm:px-8">New company? Let&apos;s make your next step easier.</div>
                <div className="p-5 sm:p-8">
                  <div className="flex items-start justify-between gap-4 border-b-4 border-[hsl(var(--chart-2))] pb-5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex size-12 items-center justify-center border-2 bg-[hsl(var(--chart-2))] shadow-[3px_3px_0_0_black]" aria-label="Northstar Digital logo">
                        <svg className="size-9" viewBox="0 0 48 48" role="img" aria-hidden="true">
                          <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
                          <path d="M24 5 28 20 43 24 28 28 24 43 20 28 5 24 20 20Z" fill="currentColor" />
                          <path d="m24 10 2.2 11.8L38 24l-11.8 2.2L24 38l-2.2-11.8L10 24l11.8-2.2Z" fill="hsl(var(--chart-2))" />
                          <circle cx="24" cy="24" r="3" fill="currentColor" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-black uppercase tracking-tight">Northstar Digital</p>
                        <p className="mt-1 text-xs font-semibold text-black/60">Make your next move matter.</p>
                      </div>
                    </div>
                    <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase tracking-wide">A warm hello</span>
                  </div>
                  <div className="mt-7 space-y-4 text-sm leading-6 sm:text-base">
                    <p>Hello <strong>Signal Forge AI Ltd</strong>,</p>
                    <p>First of all, a huge congratulations on starting your new company. It&apos;s an exciting step, and we know there is a lot to get moving at once.</p>
                    <p>We help new businesses get a confident first impression and a practical plan for finding customers:</p>
                    <ul className="list-disc space-y-1 pl-5 font-semibold">
                      <li>Website launch and conversion-ready pages</li>
                      <li>Branding that feels like you</li>
                      <li>SEO to help the right people find you</li>
                      <li>Paid media when you are ready to grow</li>
                    </ul>
                    <p>If it would be useful, we&apos;d love to have a friendly 15-minute chat and share a few ideas for Signal Forge AI Ltd. No hard sell, just useful next steps.</p>
                  </div>
                  <div className="mt-6 grid gap-4 border-2 border-black bg-[hsl(var(--chart-2))] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-black">Book a friendly 15-minute chat</p>
                      <p className="mt-1 text-xs font-semibold">Scan to choose a time: northstardigital.co.uk/start</p>
                    </div>
                    <img className="size-24 border-2 border-black bg-white p-1" src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=https%3A%2F%2Fnorthstardigital.co.uk%2Fstart" alt="QR code for the Northstar Digital booking page" loading="lazy" />
                  </div>
                  <div className="mt-4 border-2 border-black bg-black px-4 py-3 text-center text-sm font-black text-white">New company offer: 50% off your first project</div>
                  <div className="mt-7 border-t-2 pt-5">
                    <p className="font-black">All the best,</p>
                    <p className="mt-1 font-semibold">Alex Morgan · Northstar Digital</p>
                    <p className="mt-4 text-xs leading-5 text-black/70">northstardigital.co.uk · hello@northstardigital.co.uk · 020 7946 0958</p>
                    <p className="mt-3 text-[10px] leading-4 text-black/55">Printed and posted via Stannp. Usually delivered in 4–5 working days via Royal Mail or the carrier selected by Stannp. Delivery times are estimates, not guaranteed.</p>
                    <p className="mt-2 text-[10px] leading-4 text-black/50">To opt out of future post, use reference NS-EXAMPLE-2048.</p>
                  </div>
                </div>
              </article>
            </CardContent>
          </Card>
        </section>

        <section id="how-it-works" className="scroll-mt-6">
          <div className="mb-4"><p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">How it works</p><h2 className="mt-1 text-3xl font-black">From company signal to approved letter.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">
            <ProcessCard number="01" title="Filter the right companies" text="Set SIC codes, city or region, postcode prefixes and company age. Your radar only watches the audience you can serve." />
            <ProcessCard number="02" title="Personalise the message" text="Use a segment template, insert company merge fields, add your CTA and apply your agency branding." />
            <ProcessCard number="03" title="Approve the batch" text="Review new leads, preview the PDF and approve the exact batch before it is submitted to the mail provider." />
          </div>
        </section>

        <section id="sector-radars" className="scroll-mt-6">
          <div className="mb-4"><p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Sector radars</p><h2 className="mt-1 text-3xl font-black">See the signal before you build a campaign.</h2><p className="mt-2 max-w-2xl text-muted-foreground">These public previews show the kind of newly incorporated companies each audience contains. Open Agency Mode to customise the filters and letter.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SECTOR_LANDING_PAGES.map((sector) => <Card key={sector.slug} className="flex flex-col"><CardHeader><CardTitle className="text-xl">{sector.sector}</CardTitle><CardDescription>{sector.description}</CardDescription></CardHeader><CardContent className="mt-auto"><div className="mb-4 flex flex-wrap gap-1">{sector.sicCodes.map((code) => <Badge key={code} variant="outline">{code}</Badge>)}</div><Button asChild className="w-full" variant="secondary"><Link href={`/${sector.slug}`}>Open radar <ArrowRight className="size-4" /></Link></Button></CardContent></Card>)}
          </div>
        </section>

        <section className="border-2 bg-foreground p-6 text-background shadow-[6px_6px_0_0_hsl(var(--chart-2))] sm:p-8"><div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-xs font-black uppercase tracking-wide opacity-70">Ready to test your market?</p><h2 className="mt-1 text-3xl font-black">Build your first radar in minutes.</h2><p className="mt-2 max-w-xl text-sm opacity-80">The workspace is free. Physical letters stay in review until you approve the send.</p></div><Button asChild size="lg" variant="secondary"><Link href="/agency-login">Open Agency Mode <ArrowRight className="size-4" /></Link></Button></div></section>
      </div>
    </main>
  )
}

function HeroStep({ number, title, text, icon: Icon }: { number: string; title: string; text: string; icon: typeof Search }) {
  return <div className="flex gap-3 border-t-2 pt-3 first:border-t-0 first:pt-0"><div className="flex size-8 shrink-0 items-center justify-center border-2 bg-[hsl(var(--chart-2))]"><Icon className="size-4" /></div><div><p className="text-xs font-black uppercase text-muted-foreground">{number}</p><p className="font-black">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></div>
}

function ProcessCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <Card><CardHeader><Badge className="w-fit border-2" variant="outline">{number}</Badge><CardTitle className="text-xl">{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader></Card>
}
