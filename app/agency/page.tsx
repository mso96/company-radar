import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Calculator, Check, Gift, Mail, Megaphone, MessageSquareText, Palette, QrCode, Scale, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AgencyWaitlist } from "@/components/agency/agency-waitlist"
import { MarketingHeader } from "@/components/marketing/marketing-header"

export const metadata: Metadata = {
  title: "Agency Intelligence | UK Company Radar",
  description: "New company leads, competitor signals and CRM-ready radar delivery for commercial service teams.",
  alternates: { canonical: "/agency" },
}

const audiences = [
  { name: "Solicitors & legal firms", description: "Reach founders early with company, contract, trademark and employment legal support.", href: "/agency#waitlist", action: "Join the waitlist", icon: Scale },
  { name: "Marketing & digital agencies", description: "Introduce branding, websites, SEO and launch campaigns while a new business is choosing partners.", href: "/agency#waitlist", action: "Join the waitlist", icon: Megaphone },
  { name: "Accountants & bookkeepers", description: "Offer tax, payroll, bookkeeping and financial setup when a new company needs them most.", href: "/agency#waitlist", action: "Join the waitlist", icon: Calculator },
  { name: "Print & promotional suppliers", description: "Reach new businesses looking for signage, uniforms, merchandise, stationery and launch materials.", href: "/agency#waitlist", action: "Join the waitlist", icon: Gift },
]

const targetProfiles = [
  { title: "New ecommerce businesses", description: "Online retailers and new merchants preparing their first store and growth plan.", href: "/new-ecommerce-companies" },
  { title: "New gyms & fitness studios", description: "Fitness businesses looking for memberships, local visibility and a strong launch.", href: "/agency#waitlist" },
  { title: "New restaurants & hospitality", description: "New venues and hospitality teams building awareness before their opening day.", href: "/agency#waitlist" },
  { title: "New property businesses", description: "Property, estate and development companies making their first commercial moves.", href: "/new-property-companies" },
]

const letterAnatomy = [
  { number: "01", title: "Brand", description: "Logo, business name and colours", icon: Palette, accent: "bg-[hsl(var(--chart-2))]" },
  { number: "02", title: "Message", description: "Opening, services and offer", icon: MessageSquareText, accent: "bg-[hsl(var(--chart-3))]" },
  { number: "03", title: "Response", description: "CTA, QR destination and signature", icon: QrCode, accent: "bg-[hsl(var(--chart-4))]" },
]

export default function AgencyMarketingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 lg:px-8">
        <MarketingHeader />

        <section className="overflow-hidden border-2 bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))]">
          <div className="grid gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:py-12">
            <div>
              <Badge className="border-2" variant="outline">Agency Mode · private beta</Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[.96] sm:text-6xl">Find new companies. Reach them first.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Choose the SIC codes and locations you sell into. We surface newly incorporated companies, help you personalise the letter, and keep every physical send behind your approval.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link href="#waitlist">Join the private beta <ArrowRight className="size-4" /></Link></Button>
                <Link className="inline-flex items-center px-2 text-sm font-bold underline-offset-4 hover:underline" href="#how-it-works">See how it works</Link>
              </div>
            </div>
            <div className="border-2 bg-background p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">The simple loop</p>
              <div className="mt-3 space-y-3">
                <HeroStep number="01" icon={Search} title="Choose your audience" text="Pick a ready-made segment or set your own SIC and location rules." />
                <HeroStep number="02" icon={Mail} title="Make the letter yours" text="Start from a proven template, then edit the message, CTA and branding." />
                <HeroStep number="03" icon={Check} title="Review before sending" text="New matches appear inside each campaign. You approve every batch before postage." />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 border-t-2"><div className="h-3 bg-[hsl(var(--chart-1))]" /><div className="h-3 bg-[hsl(var(--chart-2))]" /><div className="h-3 bg-[hsl(var(--chart-3))]" /><div className="h-3 bg-[hsl(var(--chart-4))]" /></div>
        </section>

        <AgencyWaitlist />

        <section className="scroll-mt-6" aria-labelledby="example-letter-heading">
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Physical letter preview</p>
              <Badge className="border-2 bg-[hsl(var(--chart-2))]" variant="outline">Printed &amp; posted</Badge>
              <Badge className="border-2 bg-[hsl(var(--chart-3))]" variant="outline">Fully customisable</Badge>
            </div>
            <h2 id="example-letter-heading" className="mt-1 text-3xl font-black">Start with a proven letter. Make every part yours.</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              See how a complete branded letter can look, then replace the message, design and offer with your own before you approve a batch.
            </p>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <aside className="order-1 flex flex-col justify-center border-b-2 bg-card p-5 sm:p-8 lg:order-2 lg:border-b-0 lg:border-l-2" aria-label="Anatomy of your customisable letter">
                  <Badge className="w-fit border-2 bg-[hsl(var(--chart-3))]" variant="outline">Fully customisable</Badge>
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Anatomy of your letter</p>
                  <h3 className="mt-2 text-3xl font-black leading-tight">Make every part yours.</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                    Start with this proven structure, then shape the brand, message and response around your business.
                  </p>
                  <ol className="mt-6 border-y-2" aria-label="Customisable layers of the letter">
                    {letterAnatomy.map(({ number, title, description, icon: Icon, accent }) => (
                      <li key={number} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t-2 py-4 first:border-t-0">
                        <span className={`flex size-10 shrink-0 items-center justify-center font-black ${accent}`} aria-hidden="true">{number}</span>
                        <div>
                          <p className="font-black">{title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                        </div>
                        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                      </li>
                    ))}
                  </ol>
                  <div className="mt-5 bg-muted p-3">
                    <p className="flex items-start gap-2 text-sm font-bold"><span className="flex size-5 shrink-0 items-center justify-center bg-[hsl(var(--chart-2))]" aria-hidden="true"><Check className="size-3.5" /></span> Nothing is printed or posted until you approve it.</p>
                  </div>
                  <Button asChild className="mt-5 w-fit" size="lg">
                    <Link href="#waitlist">Join the waitlist <ArrowRight className="size-4" /></Link>
                  </Button>
                </aside>
                <figure className="order-2 bg-muted p-4 sm:p-6 lg:order-1 lg:p-8">
                  <div className="mx-auto aspect-[707/1000] w-full max-w-[640px] overflow-hidden border-2 bg-white shadow-[5px_5px_0_0_hsl(var(--foreground))]">
                    <Image
                      className="h-full w-full object-contain"
                      src="/northstar-customisable-letter.png"
                      alt="Example customisable Northstar Digital A4 letter with branded colours, personalised copy, offer, QR code and signature"
                      width={1414}
                      height={2000}
                      sizes="(min-width: 1024px) 55vw, 100vw"
                    />
                  </div>
                  <figcaption className="mt-4 text-center text-xs font-semibold text-muted-foreground">Example campaign preview · Your final letter uses your own brand and message.</figcaption>
                </figure>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="for-who" className="scroll-mt-6">
          <div className="mb-4"><p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Who it&apos;s for</p><h2 className="mt-1 text-3xl font-black">For anyone who wants to win newly formed companies as clients.</h2><p className="mt-2 max-w-2xl text-muted-foreground">If new businesses need your service, Agency Mode helps you find the right ones and reach them with a relevant letter at the right moment.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {audiences.map(({ name, description, href, action, icon: Icon }) => <Card key={name}><CardHeader><div className="mb-2 flex size-10 items-center justify-center border-2 bg-[hsl(var(--chart-3))]"><Icon className="size-5" /></div><CardTitle>{name}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={href}>{action} <ArrowRight className="size-4" /></Link></Button></CardContent></Card>)}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-6">
          <div className="mb-4"><p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">How it works</p><h2 className="mt-1 text-3xl font-black">From signal to letter.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">
            <ProcessCard number="01" title="Choose your audience" text="SIC codes, city and company age." />
            <ProcessCard number="02" title="Customise your letter" text="Services, branding and CTA." />
            <ProcessCard number="03" title="Approve and send" text="Preview, approve and post." />
          </div>
        </section>

        <section id="sector-radars" className="scroll-mt-6">
          <div className="mb-4"><p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Target company profiles</p><h2 className="mt-1 text-3xl font-black">Choose the companies you want to reach.</h2><p className="mt-2 max-w-2xl text-muted-foreground">Start with a profile of newly incorporated companies, then customise the audience and letter in Agency Mode.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {targetProfiles.map((profile) => <Card key={profile.title} className="flex flex-col"><CardHeader className="p-4"><CardTitle className="text-lg">{profile.title}</CardTitle><CardDescription className="text-sm leading-5">{profile.description}</CardDescription></CardHeader><CardContent className="mt-auto p-4 pt-0"><Link className="inline-flex items-center gap-2 text-sm font-black underline-offset-4 hover:underline" href={profile.href}>Reach this profile <ArrowRight className="size-4" /></Link></CardContent></Card>)}
          </div>
        </section>

      </div>
    </main>
  )
}

function HeroStep({ number, title, text, icon: Icon }: { number: string; title: string; text: string; icon: typeof Search }) {
  return <div className="flex gap-3 border-t-2 pt-3 first:border-t-0 first:pt-0"><div className="flex size-8 shrink-0 items-center justify-center border-2 bg-[hsl(var(--chart-2))]"><Icon className="size-4" /></div><div><p className="text-xs font-black uppercase text-muted-foreground">{number}</p><p className="font-black">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></div>
}

function ProcessCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <Card><CardHeader className="gap-2 p-4"><Badge className="w-fit border-2 px-2 py-0.5 text-xs" variant="outline">{number}</Badge><CardTitle className="text-lg">{title}</CardTitle><CardDescription className="text-sm leading-5">{text}</CardDescription></CardHeader></Card>
}
