import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

export const metadata: Metadata = {
  title: "UK Company Radar",
  description: "Business intelligence for newly registered UK companies.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return (
    <html lang="en">
      <body>
        {clerkKey ? <ClerkProvider publishableKey={clerkKey}>{children}</ClerkProvider> : children}
      </body>
    </html>
  )
}
