import type { NextConfig } from "next"

if (process.argv.includes("dev")) {
  import("@opennextjs/cloudflare").then((module) =>
    module.initOpenNextCloudflareForDev()
  )
}

const nextConfig: NextConfig = {}

export default nextConfig
