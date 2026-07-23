import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Mail, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketingHeader } from "@/components/marketing/marketing-header"

const contactEmail = "hello@companyradar.uk"
const contactHref = `mailto:${contactEmail}?subject=Agency%20Mode%20enquiry`

export const metadata: Metadata = {
  title: "Contact us | UK Company Radar",
  description: "Talk to UK Company Radar about Agency Mode and commercial intelligence for your team.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact us | UK Company Radar", description: "Talk to us about Agency Mode.", type: "website", url: "/contact" },
}

export default function ContactPage() {
  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 lg:px-8"><MarketingHeader /><section className="border-2 bg-card px-5 py-8 shadow-[6px_6px_0_0_hsl(var(--foreground))] sm:px-8 lg:px-10 lg:py-10"><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground"><Radar className="size-4" /> Contact us</div><h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.96] sm:text-6xl">Let’s build the right radar for your market.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Tell us which sectors, clients or competitors matter to your team. We will help you shape an Agency Mode workspace around them.</p></section><Card><CardHeader><div className="mb-3 flex size-10 items-center justify-center border-2 bg-[hsl(var(--chart-2))]"><Mail className="size-5" /></div><CardTitle>Email our team</CardTitle><CardDescription>For Agency Mode pricing, setup and partnership questions.</CardDescription></CardHeader><CardContent><Button asChild size="lg"><a href={contactHref}>{contactEmail}<ArrowRight className="size-4" /></a></Button><p className="mt-4 text-sm text-muted-foreground">This opens your email client with the subject “Agency Mode enquiry”.</p></CardContent></Card><p className="text-center text-sm text-muted-foreground"><Link className="font-bold text-foreground underline-offset-4 hover:underline" href="/agency">Explore Agency Mode</Link> before you get in touch.</p></div></main>
}
