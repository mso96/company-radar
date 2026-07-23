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
  const content = (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
  return clerkKey ? <ClerkProvider publishableKey={clerkKey}>{content}</ClerkProvider> : content
}
