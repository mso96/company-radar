"use client"

import * as React from "react"
import { Filter, MapPin, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SIC_LABELS } from "@/lib/sic-codes"
import type { AlertRunRecord } from "@/lib/types"

const PAGE_SIZE = 25

export function AlertResultsView({ run }: { run: AlertRunRecord }) {
  const [query, setQuery] = React.useState("")
  const [selectedSicCode, setSelectedSicCode] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)

  const availableSicCodes = React.useMemo(
    () => Array.from(new Set(run.companies.flatMap((company) => company.matchedSicCodes))).sort(),
    [run.companies]
  )

  const filteredCompanies = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return run.companies.filter((company) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        company.companyName.toLowerCase().includes(normalizedQuery) ||
        company.companyNumber.toLowerCase().includes(normalizedQuery) ||
        company.location.toLowerCase().includes(normalizedQuery)

      const matchesSic =
        selectedSicCode === "all" || company.matchedSicCodes.includes(selectedSicCode)

      return matchesQuery && matchesSic
    })
  }, [query, run.companies, selectedSicCode])

  React.useEffect(() => {
    setPage(1)
  }, [query, selectedSicCode])

  const pageCount = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Weekly matches</CardDescription>
            <CardTitle className="text-4xl">{run.matchCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tracked SIC codes</CardDescription>
            <CardTitle className="text-2xl">{run.trackedSicCodes.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {run.trackedSicCodes.map((code) => (
              <Badge key={code} variant="outline">
                {code}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Top cities</CardDescription>
            <CardTitle className="text-2xl">
              {run.topCities[0]?.name ?? "No city data"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {run.topCities.slice(0, 3).map((city) => (
              <div key={city.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <MapPin className="size-3.5" />
                  {city.name}
                </span>
                <span className="font-medium">{city.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Matched companies</CardTitle>
            <CardDescription>
              Results saved for {run.periodStart} to {run.periodEnd}
            </CardDescription>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search company name, number, or location"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="cursor-pointer px-3 py-1.5"
                variant={selectedSicCode === "all" ? "default" : "outline"}
                onClick={() => setSelectedSicCode("all")}
              >
                <Filter className="mr-1 size-3.5" />
                All
              </Badge>
              {availableSicCodes.map((code) => (
                <Badge
                  key={code}
                  className="cursor-pointer px-3 py-1.5"
                  variant={selectedSicCode === code ? "default" : "outline"}
                  onClick={() => setSelectedSicCode(code)}
                >
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {paginatedCompanies.length === 0 ? (
            <div className="rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
              No companies match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Incorporation date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Matched SIC codes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCompanies.map((company) => (
                  <TableRow key={company.companyNumber}>
                    <TableCell className="min-w-56 font-medium">{company.companyName}</TableCell>
                    <TableCell className="font-mono text-xs">{company.companyNumber}</TableCell>
                    <TableCell>{company.incorporationDate}</TableCell>
                    <TableCell className="min-w-40">{company.location}</TableCell>
                    <TableCell className="min-w-56">
                      <div className="flex flex-wrap gap-1.5">
                        {company.matchedSicCodes.map((code) => (
                          <Badge key={`${company.companyNumber}-${code}`} variant="outline">
                            {code}
                            <span className="ml-1 text-muted-foreground">
                              {SIC_LABELS[code] ? `· ${SIC_LABELS[code]}` : ""}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredCompanies.length} companies matched your current filters
            </p>
            <Pagination>
              <PaginationPrevious
                disabled={currentPage === 1}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
              />
              <PaginationNext
                disabled={currentPage === pageCount}
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              />
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
