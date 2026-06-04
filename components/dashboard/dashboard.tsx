"use client"

import * as React from "react"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SIC_LABELS } from "@/lib/sic-codes"
import type { CompaniesResponse, CompanyRecord, DateRangeKey } from "@/lib/types"

const DATE_FILTERS: Array<{ label: string; value: DateRangeKey }> = [
  { label: "Last 60 Days", value: "last60" },
  { label: "Last 30 Days", value: "last30" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
]

type SortKey = "companyName" | "incorporationDate" | "status" | "location"

const ACCENT_BACKGROUNDS = [
  "bg-[hsl(var(--chart-1))]",
  "bg-[hsl(var(--chart-2))]",
  "bg-[hsl(var(--chart-3))]",
  "bg-[hsl(var(--chart-4))]",
]

export function Dashboard() {
  const [range, setRange] = React.useState<DateRangeKey>("last60")
  const [data, setData] = React.useState<CompaniesResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("incorporationDate")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")
  const [page, setPage] = React.useState(1)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies?range=${range}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load company data.")
      }

      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error.")
    } finally {
      setIsLoading(false)
    }
  }, [range])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  React.useEffect(() => {
    setPage(1)
  }, [query, range])

  const companies = data?.companies ?? []
  const insights = data?.insights

  const filteredCompanies = React.useMemo(() => {
    return companies
      .filter((company) => {
        const terms = [
          company.companyName,
          company.companyNumber,
          company.location,
          company.region,
          ...company.sicCodes,
        ]
          .join(" ")
          .toLowerCase()

        return terms.includes(query.toLowerCase())
      })
      .sort((a, b) => {
        const left = String(a[sortKey] ?? "")
        const right = String(b[sortKey] ?? "")
        const order = left.localeCompare(right)
        return sortDirection === "asc" ? order : -order
      })
  }, [companies, query, sortDirection, sortKey])

  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredCompanies.length / pageSize))
  const pageCompanies = filteredCompanies.slice((page - 1) * pageSize, page * pageSize)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 lg:px-8">
        <header className="font-neo-grotesque overflow-hidden rounded-md border-2 bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))]">
          <div className="flex flex-col gap-8 px-5 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-10">
            <div className="flex max-w-3xl flex-col gap-5">
              <div className="flex items-center gap-3">
                <LogoMark />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Companies House Goldmine
                  </p>
                  <div className="flex w-fit items-center gap-2 rounded-md border-2 bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                    <Sparkles />
                    Live UK company formation intelligence
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h1 className="max-w-3xl text-4xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                  Discover newly registered UK companies before everyone else.
                </h1>
                <p className="max-w-2xl text-base font-medium leading-7 text-muted-foreground sm:text-lg">
                  Track formation volume, business activities, regional growth,
                  and fresh market signals directly from Companies House data.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-md border-2 bg-background p-3 shadow-[3px_3px_0_0_hsl(var(--foreground))] sm:w-[230px]">
              <div className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <CalendarDays />
                Date range
              </div>
              <Select value={range} onValueChange={(value) => setRange(value as DateRangeKey)}>
                <SelectTrigger className="h-10 w-full bg-secondary">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DATE_FILTERS.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 border-t-2">
            <div className="h-3 bg-[hsl(var(--chart-1))]" />
            <div className="h-3 bg-[hsl(var(--chart-2))]" />
            <div className="h-3 bg-[hsl(var(--chart-3))]" />
            <div className="h-3 bg-[hsl(var(--chart-4))]" />
          </div>
        </header>

        {error ? <ErrorState error={error} onRetry={loadData} /> : null}

        {isLoading || !insights ? (
          <DashboardSkeleton />
        ) : (
          <>
            <StatsRow insights={insights} />

            <BusinessActivitiesCard activities={insights.topActivities} />

            <section className="grid gap-4 lg:grid-cols-3">
              <InsightChart
                title="Top Industries"
                description="Most common SIC categories"
                data={insights.industryDistribution.slice(0, 5)}
                color="hsl(var(--chart-1))"
              />
              <InsightChart
                title="Top Regions"
                description="Company formation by region"
                data={insights.regionalDistribution.slice(0, 5)}
                color="hsl(var(--chart-3))"
              />
              <GrowthTrendCard data={insights.registrationTrend} />
            </section>

            <CompaniesTable
              companies={pageCompanies}
              shownTotal={filteredCompanies.length}
              query={query}
              setQuery={setQuery}
              page={page}
              pageCount={pageCount}
              setPage={setPage}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={(key) =>
                updateSort(key, sortKey, sortDirection, setSortKey, setSortDirection)
              }
            />
          </>
        )}

        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          Built by{" "}
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="https://twitter.com/msefaoruc"
            target="_blank"
            rel="noreferrer"
          >
            Sefa Oruc
          </a>
        </footer>
      </div>
    </main>
  )
}

function LogoMark() {
  return (
    <div
      aria-hidden="true"
      className="relative flex size-16 shrink-0 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-2))] shadow-[4px_4px_0_0_hsl(var(--foreground))]"
    >
      <svg
        className="size-12"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 46L20 22H44L54 46H10Z"
          fill="hsl(var(--chart-3))"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M20 22L28 12H36L44 22"
          fill="hsl(var(--chart-1))"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M25 31H39M22 39H42"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="32"
          cy="48"
          r="7"
          fill="hsl(var(--chart-4))"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          d="M32 44V52M28 48H36"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute -right-2 -top-2 rounded-md border-2 bg-background px-1.5 py-0.5 font-neo-grotesque text-xs font-black leading-none shadow-[2px_2px_0_0_hsl(var(--foreground))]">
        CH
      </div>
    </div>
  )
}

function StatsRow({ insights }: { insights: CompaniesResponse["insights"] }) {
  const topSic = insights.topSicCodes[0]?.name ?? "Unclassified"
  const topSicCode = simplifySic(topSic)
  const topActivity = sicDescription(topSicCode)
  const activityCount = insights.topActivities[0]?.value ?? 0

  const stats = [
    {
      label: "Total Companies",
      value: insights.totalCompanies.toLocaleString(),
      detail: "Real Companies House count",
      icon: Building2,
    },
    {
      label: "Top City",
      value: insights.topCities[0]?.name ?? "None",
      detail: `${formatCompanyCount(insights.topCities[0]?.value ?? 0)}`,
      icon: MapPin,
    },
    {
      label: "Top SIC",
      value: topSicCode,
      detail: topActivity,
      icon: BarChart3,
    },
    {
      label: "Top Business Activity",
      value: activityCount.toLocaleString(),
      detail: topActivity,
      icon: BriefcaseBusiness,
    },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={stat.label}>
          <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
            <div className="flex flex-col gap-1">
              <CardDescription>{stat.label}</CardDescription>
              {stat.label === "Top SIC" ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="line-clamp-2 cursor-help text-2xl">
                        {stat.value}
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>{stat.detail}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <CardTitle className="line-clamp-2 text-2xl">{stat.value}</CardTitle>
              )}
            </div>
            <div className={`flex size-8 items-center justify-center rounded-md border-2 text-foreground ${ACCENT_BACKGROUNDS[index % ACCENT_BACKGROUNDS.length]}`}>
              <stat.icon />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{stat.detail}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function InsightChart({
  title,
  description,
  data,
  color,
}: {
  title: string
  description: string
  data: Array<{ name: string; value: number }>
  color: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11 }}
              tickFormatter={truncateLabel}
              width={92}
            />
            <RechartsTooltip formatter={(value) => [value, "companies"]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function BusinessActivitiesCard({
  activities,
}: {
  activities: CompaniesResponse["insights"]["topActivities"]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Business Activities</CardTitle>
        <CardDescription>
          SIC activity descriptions counted from the selected date range
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {activities.map((activity, index) => (
            <div
              key={activity.code}
              className="flex items-start justify-between gap-4 rounded-md border-2 bg-background p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge
                    className={ACCENT_BACKGROUNDS[index % ACCENT_BACKGROUNDS.length]}
                    variant="outline"
                  >
                    {activity.code}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatCompanyCount(activity.value)}
                  </span>
                </div>
                <p className="text-sm font-medium leading-5">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function GrowthTrendCard({ data }: { data: CompaniesResponse["insights"]["registrationTrend"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Trends</CardTitle>
        <CardDescription>Registrations over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ReLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <Line
              type="monotone"
              dataKey="registrations"
              stroke="hsl(var(--chart-5))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--chart-5))", strokeWidth: 2 }}
            />
          </ReLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function CompaniesTable({
  companies,
  shownTotal,
  query,
  setQuery,
  page,
  pageCount,
  setPage,
  sortKey,
  sortDirection,
  onSort,
}: {
  companies: CompanyRecord[]
  shownTotal: number
  query: string
  setQuery: (query: string) => void
  page: number
  pageCount: number
  setPage: (page: number) => void
  sortKey: SortKey
  sortDirection: "asc" | "desc"
  onSort: (key: SortKey) => void
}) {
  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            {formatCompanyCount(shownTotal)} shown for exploration
          </CardDescription>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Search companies, regions, SIC"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {companies.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Company"
                  active={sortKey === "companyName"}
                  direction={sortDirection}
                  onClick={() => onSort("companyName")}
                />
                <TableHead>Number</TableHead>
                <SortableHead
                  label="Incorporated"
                  active={sortKey === "incorporationDate"}
                  direction={sortDirection}
                  onClick={() => onSort("incorporationDate")}
                />
                <SortableHead
                  label="Status"
                  active={sortKey === "status"}
                  direction={sortDirection}
                  onClick={() => onSort("status")}
                />
                <SortableHead
                  label="Location"
                  active={sortKey === "location"}
                  direction={sortDirection}
                  onClick={() => onSort("location")}
                />
                <TableHead>SIC Codes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.companyNumber}>
                  <TableCell className="min-w-56 font-medium">
                    {company.companyName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {company.companyNumber}
                  </TableCell>
                  <TableCell>{company.incorporationDate || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{company.status}</Badge>
                  </TableCell>
                  <TableCell className="min-w-40">{company.location}</TableCell>
                  <TableCell className="min-w-36">
                    <div className="flex flex-wrap gap-1">
                      {company.sicCodes.length ? (
                        company.sicCodes.map((code) => (
                          <SicBadge key={code} code={code} />
                        ))
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </p>
          <Pagination>
            <PaginationPrevious
              disabled={page === 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            />
            <PaginationNext
              disabled={page === pageCount}
              onClick={() => setPage(Math.min(pageCount, page + 1))}
            />
          </Pagination>
        </div>
      </CardContent>
    </Card>
  )
}

function SicBadge({ code }: { code: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="cursor-help" variant="outline">
            {code}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{sicDescription(code)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: "asc" | "desc"
  onClick: () => void
}) {
  return (
    <TableHead>
      <Button variant="ghost" size="sm" className="-ml-3" onClick={onClick}>
        {label}
        {active ? direction === "asc" ? <ArrowUp /> : <ArrowDown /> : null}
      </Button>
    </TableHead>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-52 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 text-destructive" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Could not load company data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-md border-2 bg-secondary p-8 text-center shadow-[3px_3px_0_0_hsl(var(--foreground))]">
      <Search />
      <p className="font-medium">No companies found</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Try another date range or search term.
      </p>
    </div>
  )
}

function updateSort(
  nextKey: SortKey,
  sortKey: SortKey,
  sortDirection: "asc" | "desc",
  setSortKey: (key: SortKey) => void,
  setSortDirection: (direction: "asc" | "desc") => void
) {
  if (nextKey === sortKey) {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    return
  }

  setSortKey(nextKey)
  setSortDirection("asc")
}

function simplifySic(value: string) {
  return value.split(" - ")[0] ?? value
}

function sicDescription(code: string) {
  return SIC_LABELS[code] ?? "SIC business activity description not available"
}

function formatCompanyCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "company" : "companies"}`
}

function truncateLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}...` : value
}
