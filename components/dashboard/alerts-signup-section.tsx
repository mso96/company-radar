"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Coffee, CreditCard, Mail, Radar, Search, Sparkles, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ALERT_MAX_SIC_CODES, ALERT_PLAN_INTERVAL, ALERT_PLAN_PRICE_GBP } from "@/lib/alerts/constants"
import { SIC_LABELS } from "@/lib/sic-codes"
import type { AlertCheckoutInput, SicOption } from "@/lib/types"

const SIC_OPTIONS: SicOption[] = Object.entries(SIC_LABELS).map(([code, description]) => ({
  code,
  description,
}))

export function AlertsSignupSection() {
  const [email, setEmail] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const options = normalizedQuery
      ? SIC_OPTIONS.filter(
          (option) =>
            option.code.includes(normalizedQuery) ||
            option.description.toLowerCase().includes(normalizedQuery)
        )
      : SIC_OPTIONS

    return options
      .filter((option) => !selectedCodes.includes(option.code))
      .slice(0, 8)
  }, [query, selectedCodes])

  function addCode(code: string) {
    if (selectedCodes.includes(code) || selectedCodes.length >= ALERT_MAX_SIC_CODES) {
      return
    }

    setSelectedCodes((current) => [...current, code])
    setQuery("")
    setError(null)
  }

  function removeCode(code: string) {
    setSelectedCodes((current) => current.filter((item) => item !== code))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const payload: AlertCheckoutInput = {
        email,
        sicCodes: selectedCodes,
      }

      const response = await fetch("/api/alerts/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to start checkout.")
      }

      setMessage("Redirecting to Stripe Checkout…")
      window.location.href = body.url
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to start checkout."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden">
        <CardHeader className="gap-4 border-b-2 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-2))] shadow-[3px_3px_0_0_hsl(var(--foreground))]">
              <Radar className="size-5" />
            </div>
            <div>
              <CardTitle>Need alerts for specific SIC codes?</CardTitle>
              <CardDescription className="mt-1">
                Track up to {ALERT_MAX_SIC_CODES} SIC codes and get a weekly email with newly
                incorporated UK companies in your categories.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="alerts-email">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="alerts-email"
                    type="email"
                    autoComplete="email"
                    className="pl-10"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-md border-2 bg-secondary px-4 py-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Price
                </p>
                <p className="mt-1 text-2xl font-black">
                  {ALERT_PLAN_PRICE_GBP}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    / {ALERT_PLAN_INTERVAL}
                  </span>
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border-2 bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                  <Coffee className="size-3.5" />
                  Only for a Greggs coffee
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  You can inspect an example weekly results page{" "}
                  <Link
                    className="font-medium text-foreground underline underline-offset-4"
                    href="/alerts/results-preview"
                    target="_blank"
                    rel="noreferrer"
                  >
                    here
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="alerts-sic-search">
                SIC codes
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="alerts-sic-search"
                  className="pl-10"
                  placeholder="Search by SIC code or business activity"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border-2 bg-background">
                {filteredOptions.length ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      className={cn(
                        "flex w-full items-start justify-between gap-3 border-b-2 px-4 py-3 text-left last:border-b-0 hover:bg-muted/50",
                        selectedCodes.length >= ALERT_MAX_SIC_CODES && "cursor-not-allowed opacity-50"
                      )}
                      onClick={() => addCode(option.code)}
                      disabled={selectedCodes.length >= ALERT_MAX_SIC_CODES}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{option.code}</p>
                        <p className="text-sm leading-5 text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-1))]">
                        <Check className="size-4" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No matching SIC codes found.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Selected SIC codes</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCodes.length}/{ALERT_MAX_SIC_CODES}
                </p>
              </div>
              <div className="flex min-h-14 flex-wrap gap-2 rounded-md border-2 bg-background p-3">
                {selectedCodes.length ? (
                  selectedCodes.map((code) => (
                    <Badge
                      key={code}
                      className="flex items-center gap-2 border-2 px-3 py-1.5"
                      variant="outline"
                    >
                      <span className="font-semibold">{code}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${code}`}
                        onClick={() => removeCode(code)}
                      >
                        <X className="size-3.5" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Pick one to three SIC codes to start your alert.
                  </p>
                )}
              </div>
            </div>

            {error ? (
              <div className="rounded-md border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
              <CreditCard className="mr-2 size-4" />
              {isSubmitting ? "Starting checkout..." : "Start alerts"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-3))] shadow-[3px_3px_0_0_hsl(var(--foreground))]">
            <Sparkles className="size-5" />
          </div>
          <CardTitle>What subscribers get</CardTitle>
          <CardDescription>
            A simple paid layer for founders, sales teams, and market researchers who want fresh
            UK company signals without checking the dashboard all week.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-md border-2 bg-muted/40 p-4">
            <p className="font-medium text-foreground">Weekly email digest</p>
            <p className="mt-1 leading-6">
              Every week we send newly incorporated companies from the last 7 days, filtered by
              the SIC codes your subscriber chose.
            </p>
          </div>
          <div className="rounded-md border-2 bg-muted/40 p-4">
            <p className="font-medium text-foreground">Real company details</p>
            <p className="mt-1 leading-6">
              Company name, number, incorporation date, location, and the matched SIC code.
            </p>
          </div>
          <div className="rounded-md border-2 bg-muted/40 p-4">
            <p className="font-medium text-foreground">Secure checkout with Stripe</p>
            <p className="mt-1 leading-6">
              No account setup for v1. Just choose the codes, pay, and start receiving the alert
              emails.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
