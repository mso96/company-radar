import type { NextConfig } from "next"

if (process.argv.includes("dev")) {
  import("@opennextjs/cloudflare").then((module) =>
    module.initOpenNextCloudflareForDev()
  )
}

// Clerk's publishable key is intentionally public and must be embedded in the
// browser bundle at build time. Cloudflare runtime secrets are not available
// while Next.js builds, so retain the production publishable-key fallback here.
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      "pk_live_Y2xlcmsuY29tcGFueXJhZGFyLnVrJA",
  },
}

export default nextConfig
