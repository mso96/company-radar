"use client"

import * as React from "react"
import { ArrowRight, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AgencyWaitlist() {
  const [email, setEmail] = React.useState("")
  const [company, setCompany] = React.useState("")
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle")
  const [message, setMessage] = React.useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("submitting")
    setMessage("")
    try {
      const response = await fetch("/api/agency/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Unable to join the waitlist. Please try again.")
      setStatus("success")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unable to join the waitlist. Please try again.")
    }
  }

  return (
    <section id="waitlist" aria-labelledby="waitlist-heading" className="scroll-mt-6 border-2 bg-[hsl(var(--chart-2))] p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
        <div>
          <Badge variant="outline" className="border-2 bg-background">Agency Mode · Private beta</Badge>
          <h2 id="waitlist-heading" className="mt-3 text-3xl font-black">Join the Agency Mode waitlist.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6">We&apos;re testing with a small group before launch. Leave your email and we&apos;ll invite you when a place is ready.</p>
          <p className="mt-3 text-xs font-bold">Find new companies · Personalise outreach · Approve every send</p>
        </div>
        <div>
            {status === "success" ? (
              <div className="border-2 bg-background p-4" role="status">
                <p className="flex items-center gap-2 text-xl font-black"><Check className="size-5" /> You&apos;re on the list.</p>
                <p className="mt-1 text-sm">We&apos;ll email you when a private beta place is ready.</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-3">
                <label htmlFor="waitlist-email" className="block text-sm font-black">Email address</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="waitlist-email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" aria-describedby="waitlist-privacy waitlist-error" className="h-12 min-w-0 flex-1" />
                  <Button type="submit" size="lg" disabled={status === "submitting" || !email.trim()} className="h-12 shrink-0">{status === "submitting" ? "Joining…" : "Join the waitlist"}<ArrowRight className="size-4" /></Button>
                </div>
                <div className="absolute -left-[9999px] top-auto size-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="waitlist-company">Company</label>
                  <input id="waitlist-company" name="company" type="text" autoComplete="off" tabIndex={-1} value={company} onChange={(event) => setCompany(event.target.value)} />
                </div>
                <p id="waitlist-privacy" className="text-xs leading-5">We&apos;ll only use your email for Agency Mode early-access invitations.</p>
                {status === "error" ? <p id="waitlist-error" className="border-l-4 border-destructive pl-3 text-sm font-bold text-destructive" role="alert">{message}</p> : <span id="waitlist-error" className="sr-only" />}
              </form>
            )}
        </div>
      </div>
    </section>
  )
}
