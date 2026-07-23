"use client"

import * as React from "react"
import Link from "next/link"
import { SignIn, SignUp } from "@clerk/nextjs"
import { ArrowRight, Mail, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

const clerkAppearance = {
  variables: { colorPrimary: "#c6ff00", colorText: "#111111", borderRadius: "0px" },
  elements: {
    rootBox: "w-full max-w-none",
    card: "w-full max-w-none border-0 bg-transparent p-0 shadow-none",
    main: "w-full max-w-none",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton: "h-12 w-full rounded-none border-2 border-foreground bg-background font-bold shadow-[3px_3px_0_0_hsl(var(--foreground))]",
    formFieldLabel: "font-bold text-foreground",
    formFieldInput: "h-12 rounded-none border-2 border-foreground bg-background text-base",
    formButtonPrimary: "h-12 rounded-none border-2 border-foreground bg-foreground text-background shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:bg-foreground/90",
    footerActionLink: "font-bold text-foreground underline",
    footer: "mt-6 border-t-2 border-foreground/10 pt-4",
  },
}

function ClerkAuthPanel() {
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">(() => typeof window !== "undefined" && window.location.hash === "#sign-up" ? "sign-up" : "sign-in")
  function selectMode(nextMode: "sign-in" | "sign-up") {
    setMode(nextMode)
    window.history.replaceState(null, "", `/agency-login#${nextMode}`)
  }
  return (
    <>
      <div className="mb-6 grid grid-cols-2 border-2">
        <button className={mode === "sign-in" ? "bg-[hsl(var(--chart-2))] px-3 py-2 text-sm font-black" : "px-3 py-2 text-sm font-bold"} onClick={() => selectMode("sign-in")} type="button">Sign in</button>
        <button className={mode === "sign-up" ? "bg-[hsl(var(--chart-2))] px-3 py-2 text-sm font-black" : "px-3 py-2 text-sm font-bold"} onClick={() => selectMode("sign-up")} type="button">Create account</button>
      </div>
      {mode === "sign-in" ? <SignIn routing="hash" signUpUrl="/agency-login#sign-up" appearance={clerkAppearance} /> : <SignUp routing="hash" signInUrl="/agency-login#sign-in" appearance={clerkAppearance} />}
    </>
  )
}

export function AgencyLogin() {
  const [email, setEmail] = React.useState("")
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = React.useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setState("sending")
    try {
      const response = await fetch("/api/auth/request-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error)
      setState("sent"); setMessage("Check your inbox for a secure sign-in link.")
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "Unable to send sign-in link.") }
  }

  async function openDemo() {
    setState("sending")
    try {
      const response = await fetch("/api/auth/demo", { method: "POST" })
      if (!response.ok) throw new Error("Demo access is only available in local development.")
      location.assign("/app")
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "Unable to open demo workspace.") }
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground"><div className="mx-auto max-w-4xl"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold underline-offset-4 hover:underline"><Radar className="size-4" /> UK Company Radar</Link><Card className="mt-8 border-2 shadow-[6px_6px_0_0_hsl(var(--foreground))]"><CardHeader className="px-6 pb-4 sm:px-10 sm:pt-10"><CardTitle className="text-3xl font-black sm:text-5xl">Start your free Agency workspace</CardTitle><CardDescription className="mt-3 max-w-2xl text-base leading-7 sm:text-lg">Find new companies, prepare branded letters and approve every send. No card required.</CardDescription></CardHeader><CardContent className="px-6 pb-8 sm:px-10 sm:pb-10">{clerkEnabled ? <ClerkAuthPanel /> : <><form className="space-y-4" onSubmit={submit}><label className="block space-y-2 text-sm font-semibold"><span>Email address</span><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@agency.com" required /></div></label>{message ? <p className={state === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{message}</p> : null}<Button disabled={state === "sending"} type="submit">{state === "sending" ? "Sending…" : "Email me a sign-in link"}<ArrowRight className="ml-2 size-4" /></Button></form>{process.env.NODE_ENV === "development" ? <div className="mt-6 border-t-2 pt-5"><p className="mb-3 text-sm text-muted-foreground">Local preview — open the demo workspace without email or database setup.</p><Button disabled={state === "sending"} variant="outline" onClick={openDemo}>Open demo workspace <ArrowRight className="ml-2 size-4" /></Button></div> : null}</>}</CardContent></Card></div></main>
}
