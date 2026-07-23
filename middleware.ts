import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)

export default clerkEnabled
  ? clerkMiddleware(async (auth, request) => {
      const pathname = request.nextUrl.pathname
      if (pathname === "/app" || pathname.startsWith("/app/") || pathname === "/api/app" || pathname.startsWith("/api/app/")) {
        await auth.protect()
      }
    })
  : function middleware() {
      return NextResponse.next()
    }

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}
