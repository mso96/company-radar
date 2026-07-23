declare global {
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement
    first<T = Record<string, unknown>>(): Promise<T | null>
    run(): Promise<unknown>
    all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>
  }

  interface CloudflareEnv {
    ALERTS_DB?: D1Database
    COMPANIES_HOUSE_API_KEY?: string
    SITE_URL?: string
    STRIPE_SECRET_KEY?: string
    STRIPE_WEBHOOK_SECRET?: string
    STRIPE_PRICE_ID?: string
    RESEND_API_KEY?: string
    ALERT_FROM_EMAIL?: string
    TELEGRAM_BOT_TOKEN?: string
    TELEGRAM_CHAT_ID?: string
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
    CLERK_SECRET_KEY?: string
  }
}

export {}
