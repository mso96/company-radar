"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export default function AgencySsoCallbackPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500">
      {clerkEnabled ? <AuthenticateWithRedirectCallback /> : "Sign-in configuration is unavailable."}
    </main>
  )
}
