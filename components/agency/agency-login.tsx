"use client"

import * as React from "react"
import Link from "next/link"
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy"
import { ArrowLeft, ArrowRight, Check, Mail, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

type AuthMode = "sign-in" | "sign-up"
type AuthStep = "identifier" | "password" | "verification"

function readAuthError(error: unknown) {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors
    if (errors?.[0]) return errors[0].longMessage || errors[0].message || "We could not complete that request."
  }
  return error instanceof Error ? error.message : "We could not complete that request."
}

function AuthField({ label, type = "text", value, onChange, placeholder, autoComplete }: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete?: string
}) {
  return (
    <label className="block space-y-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <Input
        className="h-12 rounded-xl border-slate-200 bg-white px-4 text-base shadow-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
    </label>
  )
}

function CustomClerkAuth({ mode, onModeChange }: { mode: AuthMode; onModeChange: (mode: AuthMode) => void }) {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn()
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp()
  const [step, setStep] = React.useState<AuthStep>("identifier")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [code, setCode] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  const loaded = mode === "sign-in" ? signInLoaded && Boolean(signIn) : signUpLoaded && Boolean(signUp)
  const activeSet = mode === "sign-in" ? setSignInActive : setSignUpActive

  function switchMode(nextMode: AuthMode) {
    setError("")
    setStep("identifier")
    setPassword("")
    setCode("")
    onModeChange(nextMode)
    window.history.replaceState(null, "", `/agency-login#${nextMode}`)
  }

  async function finalize(sessionId: string | null) {
    if (!sessionId || !activeSet) throw new Error("Your account was created, but the session could not be started.")
    await activeSet({ session: sessionId })
    window.location.assign("/app")
  }

  async function startSignIn() {
    if (!signIn) return
    const result = await signIn.create({ identifier: email })
    if (result.status === "complete") return finalize(result.createdSessionId)
    const passwordFactor = result.supportedFirstFactors?.some((factor) => factor.strategy === "password")
    if (passwordFactor) setStep("password")
    else {
      const emailFactor = result.supportedFirstFactors?.find((factor) => factor.strategy === "email_code")
      if (!emailFactor || !("emailAddressId" in emailFactor)) throw new Error("Email verification is not enabled for this account.")
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId })
      setStep("verification")
    }
  }

  async function finishSignIn() {
    if (!signIn) return
    const result = step === "password"
      ? await signIn.attemptFirstFactor({ strategy: "password", password })
      : await signIn.attemptFirstFactor({ strategy: "email_code", code })
    if (result.status === "complete") return finalize(result.createdSessionId)
    throw new Error("One more verification step is required.")
  }

  async function startSignUp() {
    if (!signUp) return
    const result = await signUp.create({ emailAddress: email, password })
    if (result.status === "complete") return finalize(result.createdSessionId)
    await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
    setStep("verification")
  }

  async function finishSignUp() {
    if (!signUp) return
    const result = await signUp.attemptEmailAddressVerification({ code })
    if (result.status === "complete") return finalize(result.createdSessionId)
    throw new Error("Please complete the verification before continuing.")
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      if (mode === "sign-in" && step === "identifier") await startSignIn()
      else if (mode === "sign-in") await finishSignIn()
      else if (step === "identifier") await startSignUp()
      else await finishSignUp()
    } catch (authError) {
      setError(readAuthError(authError))
    } finally {
      setBusy(false)
    }
  }

  async function continueWithGoogle() {
    setBusy(true)
    setError("")
    try {
      const resource = mode === "sign-in" ? signIn : signUp
      if (!resource) throw new Error("Authentication is still loading. Please try again.")
      await resource.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/agency-login/sso-callback",
        redirectUrlComplete: "/app",
      })
    } catch (authError) {
      setBusy(false)
      setError(readAuthError(authError))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => switchMode("sign-in")} className={mode === "sign-in" ? "rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm" : "rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900"}>Sign in</button>
        <button type="button" onClick={() => switchMode("sign-up")} className={mode === "sign-up" ? "rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm" : "rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900"}>Create account</button>
      </div>

      {step === "verification" ? (
        <button type="button" onClick={() => { setStep("identifier"); setCode(""); setError("") }} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Use a different email</button>
      ) : null}

      <button type="button" onClick={continueWithGoogle} disabled={!loaded || busy} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><span className="text-base font-bold text-[#4285F4]">G</span> Continue with Google</button>
      <div className="flex items-center gap-3 text-xs font-medium text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>or continue with email</span><span className="h-px flex-1 bg-slate-200" /></div>

      <form className="space-y-4" onSubmit={submit}>
        {step === "identifier" ? <AuthField label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@agency.com" autoComplete="email" /> : null}
        {mode === "sign-up" && step === "identifier" ? <AuthField label="Create a password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" /> : null}
        {mode === "sign-in" && step === "password" ? <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" /> : null}
        {step === "verification" ? <AuthField label="Verification code" value={code} onChange={setCode} placeholder="Enter the code from your email" autoComplete="one-time-code" /> : null}
        {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p> : null}
        <Button className="h-12 w-full rounded-xl bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800" disabled={!loaded || busy} type="submit">{busy ? "Please wait…" : step === "verification" ? "Verify and continue" : step === "password" ? "Sign in" : mode === "sign-up" ? "Create free workspace" : "Continue"}<ArrowRight className="ml-2 size-4" /></Button>
      </form>

      {step === "verification" ? <p className="text-center text-sm leading-6 text-slate-500">We sent a verification code to <strong className="font-semibold text-slate-700">{email}</strong>.</p> : null}
      <p className="flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400"><Check className="size-3.5 text-emerald-500" /> Secure sign-in · No card required</p>
    </div>
  )
}

export function AgencyLogin() {
  const [email, setEmail] = React.useState("")
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = React.useState("")
  const [mode, setMode] = React.useState<AuthMode>(() => typeof window !== "undefined" && window.location.hash === "#sign-up" ? "sign-up" : "sign-in")

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

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 sm:py-14"><div className="w-full max-w-[460px]"><Link href="/" className="mx-auto mb-7 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold tracking-tight text-slate-700 transition hover:text-slate-950"><span className="flex size-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm"><Radar className="size-4" /></span> UK Company Radar</Link><section className="rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-xl shadow-slate-900/5 sm:px-9 sm:py-9"><div className="mb-7 text-center"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Agency Mode</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">Start your free workspace</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">Find new companies, prepare branded letters, and approve every send.</p></div>{clerkEnabled ? <CustomClerkAuth mode={mode} onModeChange={setMode} /> : <><div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setMode("sign-in")} className={mode === "sign-in" ? "rounded-lg bg-white px-3 py-2.5 text-sm font-semibold shadow-sm" : "rounded-lg px-3 py-2.5 text-sm text-slate-500"}>Sign in</button><button type="button" onClick={() => setMode("sign-up")} className={mode === "sign-up" ? "rounded-lg bg-white px-3 py-2.5 text-sm font-semibold shadow-sm" : "rounded-lg px-3 py-2.5 text-sm text-slate-500"}>Create account</button></div><form className="space-y-4" onSubmit={submit}><label className="block space-y-2 text-sm font-semibold text-slate-700"><span>Email address</span><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="h-12 rounded-xl border-slate-200 pl-10 shadow-sm" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@agency.com" required /></div></label>{message ? <p className={state === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{message}</p> : null}<Button className="h-12 w-full rounded-xl bg-slate-900 font-semibold text-white hover:bg-slate-800" disabled={state === "sending"} type="submit">{state === "sending" ? "Sending…" : "Email me a sign-in link"}<ArrowRight className="ml-2 size-4" /></Button></form>{process.env.NODE_ENV === "development" ? <div className="mt-7 border-t border-slate-100 pt-5"><p className="mb-3 text-sm leading-6 text-slate-500">Local preview only — open the demo workspace without email or database setup.</p><Button className="h-11 rounded-xl border-slate-200" disabled={state === "sending"} variant="outline" onClick={openDemo}>Open demo workspace <ArrowRight className="ml-2 size-4" /></Button></div> : null}</>}</section><p className="mt-5 text-center text-xs text-slate-400">Free workspace · Branded letters · Owner approval on every send</p></div></main>
}
