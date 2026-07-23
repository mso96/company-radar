"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function OptOutPage() {
  const [message, setMessage] = React.useState<string | null>(null); const [error, setError] = React.useState<string | null>(null)
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage(null); setError(null); const form = new FormData(event.currentTarget); const response = await fetch("/api/opt-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: form.get("reference"), companyNumber: form.get("companyNumber") }) }); const body = await response.json(); if (!response.ok) { setError(body.error ?? "Unable to process your request."); return } setMessage("Your postal marketing opt-out has been recorded. Pending letters have been stopped.") }
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground"><div className="mx-auto max-w-xl"><Link className="text-sm font-bold underline-offset-4 hover:underline" href="/">UK Company Radar</Link><Card className="mt-8 border-2 shadow-[6px_6px_0_0_hsl(var(--foreground))]"><CardHeader><CardTitle className="text-3xl font-black">Stop postal marketing</CardTitle><CardDescription>Enter the reference and company number printed on your letter. We will suppress future physical mail from that agency workspace.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><Input name="reference" placeholder="Letter reference" required /><Input name="companyNumber" placeholder="Company number" required /><Button type="submit">Confirm opt-out</Button></form>{message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}</CardContent></Card></div></main>
}
