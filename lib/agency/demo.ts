import type { AgencyEvent, AgencyLead, AgencyRadar, AgencySegment, AgencySession, AgencyTemplateLibraryItem, WatchlistCompany } from "@/lib/agency/types"

export const LOCAL_DEMO_EMAIL = "demo@companyradar.local"
export const LOCAL_DEMO_SESSION_TOKEN = "local-agency-demo-session"

export function isLocalAgencyDemoEnabled() {
  return process.env.NODE_ENV === "development"
}

export function isLocalAgencyDemoSession(session: AgencySession) {
  return session.userId === "local-agency-demo-user"
}

export function getLocalAgencyDemoSession(): AgencySession {
  return { userId: "local-agency-demo-user", email: LOCAL_DEMO_EMAIL, workspaceId: "local-agency-demo-workspace", workspaceName: "Northstar Digital — demo workspace", role: "owner" }
}

export function getLocalAgencyDemoData(): { radars: AgencyRadar[]; leads: AgencyLead[]; events: AgencyEvent[]; watchlist: WatchlistCompany[]; members: Array<{ email: string; role: "owner" | "member" }> } {
  const createdAt = "2026-07-13T08:00:00.000Z"
  return {
    radars: [{ id: "demo-radar-ai", workspaceId: "local-agency-demo-workspace", name: "AI & software prospects", city: "", region: "", cities: [], segmentSlug: "it-software", segmentSlugs: ["it-software"], serviceFocus: ["Cloud setup", "Software delivery", "Support"], keywords: ["AI", "software"], companyTypes: [], eventTypes: ["company.incorporated"], deliveryFrequency: "daily", isActive: true, sicCodes: ["62012", "62020"], createdAt }],
    leads: [
      { id: "demo-lead-1", workspaceId: "local-agency-demo-workspace", radarId: "demo-radar-ai", radarName: "AI & software prospects", score: 92, createdAt, matchReasons: ["SIC 62012", "keyword: AI"], company: { companyName: "Signal Forge AI Ltd", companyNumber: "16482001", incorporationDate: "2026-07-12", location: "London", region: "Greater London", sicCodes: ["62012"], matchedKeywords: ["AI"], status: "active", type: "ltd" } },
      { id: "demo-lead-2", workspaceId: "local-agency-demo-workspace", radarId: "demo-radar-ai", radarName: "AI & software prospects", score: 78, createdAt, matchReasons: ["SIC 62020", "new incorporation"], company: { companyName: "North Loop Systems Ltd", companyNumber: "16482002", incorporationDate: "2026-07-12", location: "Manchester", region: "North West", sicCodes: ["62020"], matchedKeywords: [], status: "active", type: "ltd" } },
    ],
    events: [{ id: "demo-event-1", companyNumber: "08673129", companyName: "Example Competitor Ltd", eventType: "company.officer.changed", eventAt: "2026-07-12T10:30:00.000Z", sourceRecord: {}, relationshipType: "competitor", createdAt }],
    watchlist: [{ id: "demo-watch-1", companyNumber: "08673129", companyName: "Example Competitor Ltd", relationshipType: "competitor", updatedAt: createdAt }],
    members: [{ email: "owner@northstar.digital", role: "owner" }, { email: LOCAL_DEMO_EMAIL, role: "member" }],
  }
}

export function getLocalAgencyCatalog(): { segments: AgencySegment[]; templates: AgencyTemplateLibraryItem[] } {
  const definitions = [
    ["digital-agencies", "Digital agencies", "Web and digital agencies", ["62012", "62020", "62090"]],
    ["web-design-services", "Web design services", "Web design studios", ["62012", "74100"]],
    ["marketing-advertising", "Marketing & advertising", "Marketing agencies", ["73110", "73120"]],
    ["it-software", "IT & software", "IT service providers", ["62012", "62020", "62090"]],
    ["accounting-bookkeeping", "Accounting & bookkeeping", "Accountancy firms", ["69201", "69202"]],
    ["property-services", "Property services", "Property service providers", ["68310", "68320", "68100"]],
    ["construction-services", "Construction services", "Construction service providers", ["41100", "41201", "43290"]],
    ["ecommerce-services", "Ecommerce services", "Ecommerce agencies", ["47910", "47990"]],
    ["legal-services", "Legal services", "Legal service providers", ["69102", "69109"]],
    ["recruitment-consultancy", "Recruitment & business consultancy", "Recruitment and consultancy firms", ["78109", "70221", "70229"]],
  ] as const
  const segments = definitions.map(([slug, name, persona, sicCodes], index) => ({ slug, name, description: `Find new ${name.toLowerCase()} opportunities before competitors do.`, persona, sicCodes: [...sicCodes], defaultFilters: { companyAgeDays: 30 }, defaultTemplateId: `tpl-${slug}`, pricePence: 120, currency: "GBP", featuredRank: index + 1, isActive: true }))
  const services: Record<string, string[]> = { "digital-agencies": ["Website launch", "Branding", "SEO", "Paid media", "Conversion optimisation"], "accounting-bookkeeping": ["Bookkeeping", "Payroll", "VAT returns", "Year-end accounts", "Tax planning"], "legal-services": ["Incorporation", "Commercial contracts", "Employment agreements", "IP protection", "Compliance"], "property-services": ["Conveyancing", "Property management", "Landlord support", "Valuation", "Commercial property advice"], "recruitment-consultancy": ["First hires", "Payroll setup", "Employment processes", "Recruitment campaigns"] }
  const bodyCopy: Record<string, string> = {
    "digital-agencies": "<p>Hello {{company_name}},</p><p>Congratulations on launching your new business. The first few months are a great time to make sure your brand, website and acquisition plan are ready for the customers you want to win.</p><p>Our team helps new companies with:</p><ul><li>{{service_focus}}</li></ul><p>We combine practical delivery with clear commercial goals, so you can launch confidently without coordinating several suppliers yourself.</p><p>We would be happy to review what you are building and share three useful next steps for {{company_name}}.</p>",
    "accounting-bookkeeping": "<p>Hello {{company_name}},</p><p>Congratulations on your new company. Setting up the right financial routines early can make the difference between feeling in control and spending every month chasing paperwork.</p><p>We support founders with:</p><ul><li>{{service_focus}}</li></ul><p>Our approach is straightforward: clear advice, reliable deadlines and numbers you can use when making decisions about hiring, pricing and growth.</p><p>We can arrange a short introduction and explain what should be in place before your first year-end.</p>",
    "legal-services": "<p>Hello {{company_name}},</p><p>Starting a company brings important decisions about contracts, ownership, employment and compliance. Getting those foundations right now can prevent expensive problems later.</p><p>Our legal team can help with:</p><ul><li>{{service_focus}}</li></ul><p>We explain practical options in plain English and focus on documents that protect your business while helping you move quickly.</p><p>Reply to this letter if you would like an initial conversation about what matters most to {{company_name}}.</p>",
    "property-services": "<p>Hello {{company_name}},</p><p>Congratulations on establishing your new property business. Early decisions around acquisition, tenants, operations and reporting often shape how smoothly a portfolio grows.</p><p>We help property businesses with:</p><ul><li>{{service_focus}}</li></ul><p>Whether you are buying your first property, supporting landlords or preparing a commercial opportunity, our team gives you practical support from the start.</p><p>We would be glad to learn what you are planning and suggest a focused next step.</p>",
    "recruitment-consultancy": "<p>Hello {{company_name}},</p><p>New companies often reach their first growth milestone quickly. The right hiring process and people plan can help you grow without creating unnecessary cost or risk.</p><p>We support founders with:</p><ul><li>{{service_focus}}</li></ul><p>From defining the first role to building a repeatable process, we provide hands-on guidance tailored to your stage of business.</p><p>If hiring is on your roadmap, we would be happy to share a short plan for {{company_name}}.</p>"
  }
  const templates = segments.map((segment) => ({ id: `tpl-${segment.slug}`, segmentSlug: segment.slug, name: `${segment.name} introduction`, description: segment.description, subject: "A practical way to support {{company_name}}", bodyHtml: bodyCopy[segment.slug] ?? "<p>Hello {{company_name}},</p><p>Congratulations on your new company. The early stage is a useful time to put the right foundations in place before opportunities start moving quickly.</p><p>We can support you with:</p><ul><li>{{service_focus}}</li></ul><p>Our team provides practical, focused help based on your goals and the next stage of growth.</p><p>We would be happy to arrange a short introduction and share relevant ideas for {{company_name}}.</p>", ctaText: "Book a short introduction", ctaUrl: "https://example.com", signature: "Your team", mergeFields: ["company_name", "company_number", "incorporation_date", "sic_codes", "location", "registered_office_address", "agency_name", "service_focus", "opt_out_reference"], serviceFocus: services[segment.slug] ?? ["Business setup", "Growth support"], pricePence: 120, currency: "GBP", version: "1" }))
  return { segments, templates }
}
