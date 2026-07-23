import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, Mail, Radar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketingHeader } from "@/components/marketing/marketing-header"

export const metadata: Metadata = {
  title: "Pricing | UK Company Radar",
  description: "Buy direct-mail credits and turn new company signals into controlled physical outreach.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Pricing | UK Company Radar", description: "Direct-mail credits for Agency Mode.", type: "website", url: "/pricing" },
}

const radarFeatures = ["SIC, city and keyword radars", "Daily new-company discovery", "Lead inbox and review queue", "Letter template composer"]
const mailFeatures = ["Prepaid physical-mail credits", "Address validation before send", "Stannp print and delivery status", "Automatic refund on provider failure"]

export default function PricingPage() {
  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 lg:px-8"><MarketingHeader /><section className="border-2 bg-card px-5 py-8 shadow-[6px_6px_0_0_hsl(var(--foreground))] sm:px-8"><Badge variant="outline" className="border-2">Agency pricing</Badge><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[.96] sm:text-6xl">Own the next company on your client’s market.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Agency Mode is free to set up. Buy mail credits only when you are ready to send a reviewed physical-letter batch.</p></section><section className="grid gap-5 lg:grid-cols-2"><PriceCard icon={<Radar className="size-5" />} name="Agency Mode" description="Build radars and prepare outreach without a platform subscription." price="Free" features={radarFeatures} cta="Open Agency Mode" href="/agency-login" /><PriceCard icon={<Mail className="size-5" />} name="Mail credits" description="Prepaid credits are configured in your workspace before checkout." price="Pay as you send" features={mailFeatures} cta="Open credits" href="/agency-login" featured /></section></div></main>
}

function PriceCard({ icon, name, description, price, suffix, features, cta, href, featured = false }: { icon: React.ReactNode; name: string; description: string; price: string; suffix?: string; features: string[]; cta: string; href: string; featured?: boolean }) {
  return <Card className={featured ? "border-2 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]" : ""}><CardHeader><div className="mb-3 flex size-10 items-center justify-center border-2 bg-[hsl(var(--chart-3))]">{icon}</div><CardTitle className="text-2xl">{name}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><p className="text-4xl font-black">{price}{suffix ? <span className="text-base font-medium text-muted-foreground">{suffix}</span> : null}</p><ul className="my-6 space-y-3 text-sm">{features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0" />{feature}</li>)}</ul><Button asChild className="w-full" variant={featured ? "default" : "outline"}><Link href={href}>{cta}<ArrowRight className="size-4" /></Link></Button></CardContent></Card>
}
