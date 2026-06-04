import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Companies House Goldmine",
  description: "Business intelligence for newly registered UK companies.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
