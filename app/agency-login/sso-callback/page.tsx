"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export default function AgencySsoCallbackPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500">Completing secure sign-in…<AuthenticateWithRedirectCallback /></main>
}
