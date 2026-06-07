import { Eye, Radar } from "lucide-react"
import { AlertResultsView } from "@/components/alerts/alert-results-view"
import { Badge } from "@/components/ui/badge"
import type { AlertRunRecord } from "@/lib/types"

const previewRun: AlertRunRecord = {
  id: "preview-run",
  subscriptionId: "preview-subscription",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-07",
  matchCount: 42,
  trackedSicCodes: ["62012", "70229", "68100"],
  topCities: [
    { name: "London", value: 14 },
    { name: "Manchester", value: 7 },
    { name: "Birmingham", value: 5 },
    { name: "Leeds", value: 4 },
    { name: "Bristol", value: 3 },
  ],
  accessToken: "preview-token",
  createdAt: "2026-06-08T08:00:00.000Z",
  companies: [
    {
      companyNumber: "16300101",
      companyName: "Signal Loop Software Ltd",
      incorporationDate: "2026-06-07",
      location: "London, Greater London, EC2A",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300102",
      companyName: "North Star Advisory Partners Ltd",
      incorporationDate: "2026-06-07",
      location: "Manchester, Greater Manchester, M1",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300103",
      companyName: "Civic Property Ventures Ltd",
      incorporationDate: "2026-06-07",
      location: "London, Greater London, E1",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300104",
      companyName: "Foundry AI Systems Ltd",
      incorporationDate: "2026-06-07",
      location: "Cambridge, Cambridgeshire, CB1",
      matchedSicCodes: ["62012", "70229"],
    },
    {
      companyNumber: "16300105",
      companyName: "Harbour Growth Consulting Ltd",
      incorporationDate: "2026-06-07",
      location: "Liverpool, Merseyside, L1",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300106",
      companyName: "Elm Street Homes Ltd",
      incorporationDate: "2026-06-07",
      location: "Birmingham, West Midlands, B1",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300107",
      companyName: "Orbit Software Works Ltd",
      incorporationDate: "2026-06-07",
      location: "London, Greater London, SE1",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300108",
      companyName: "Peak Commercial Advisory Ltd",
      incorporationDate: "2026-06-06",
      location: "Leeds, West Yorkshire, LS1",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300109",
      companyName: "Bridgewater Assets Ltd",
      incorporationDate: "2026-06-06",
      location: "London, Greater London, W1",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300110",
      companyName: "Atlas Product Engineering Ltd",
      incorporationDate: "2026-06-06",
      location: "Bristol, Bristol, BS1",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300111",
      companyName: "Thrive Strategy Studio Ltd",
      incorporationDate: "2026-06-06",
      location: "Manchester, Greater Manchester, M4",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300112",
      companyName: "Canary Quay Property Ltd",
      incorporationDate: "2026-06-06",
      location: "London, Greater London, E14",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300113",
      companyName: "Kernel Flow Labs Ltd",
      incorporationDate: "2026-06-06",
      location: "Edinburgh, Scotland, EH1",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300114",
      companyName: "Signal Peak Advisory Ltd",
      incorporationDate: "2026-06-06",
      location: "London, Greater London, N1",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300115",
      companyName: "Bramble Street Property Group Ltd",
      incorporationDate: "2026-06-05",
      location: "Manchester, Greater Manchester, M3",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300116",
      companyName: "Avenue Logic Solutions Ltd",
      incorporationDate: "2026-06-05",
      location: "London, Greater London, WC1",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300117",
      companyName: "Meridian Advisory Works Ltd",
      incorporationDate: "2026-06-05",
      location: "Leeds, West Yorkshire, LS2",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300118",
      companyName: "Stone Gate Residential Ltd",
      incorporationDate: "2026-06-05",
      location: "Birmingham, West Midlands, B3",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300119",
      companyName: "Northline Platform Labs Ltd",
      incorporationDate: "2026-06-05",
      location: "London, Greater London, EC1V",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300120",
      companyName: "Cinder Hill Consulting Ltd",
      incorporationDate: "2026-06-05",
      location: "Bristol, Bristol, BS8",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300121",
      companyName: "Bricklane Holdings Ltd",
      incorporationDate: "2026-06-05",
      location: "London, Greater London, E2",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300122",
      companyName: "Forgebeam Systems Ltd",
      incorporationDate: "2026-06-04",
      location: "Manchester, Greater Manchester, M2",
      matchedSicCodes: ["62012", "70229"],
    },
    {
      companyNumber: "16300123",
      companyName: "Redwood Operator Advisory Ltd",
      incorporationDate: "2026-06-04",
      location: "Nottingham, Nottinghamshire, NG1",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300124",
      companyName: "Harbour Stone Property Ltd",
      incorporationDate: "2026-06-04",
      location: "London, Greater London, SW11",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300125",
      companyName: "Quantum Domestic Software Ltd",
      incorporationDate: "2026-06-04",
      location: "Oxford, Oxfordshire, OX1",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300126",
      companyName: "Beacon Ridge Partners Ltd",
      incorporationDate: "2026-06-04",
      location: "London, Greater London, W6",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300127",
      companyName: "Urban Yard Investments Ltd",
      incorporationDate: "2026-06-04",
      location: "Leeds, West Yorkshire, LS10",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300128",
      companyName: "Patchwork Software Group Ltd",
      incorporationDate: "2026-06-03",
      location: "London, Greater London, N7",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300129",
      companyName: "Hinterland Advisory Studio Ltd",
      incorporationDate: "2026-06-03",
      location: "Birmingham, West Midlands, B15",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300130",
      companyName: "Kings Wharf Property Ltd",
      incorporationDate: "2026-06-03",
      location: "London, Greater London, SE10",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300131",
      companyName: "Cloudline Product Systems Ltd",
      incorporationDate: "2026-06-03",
      location: "Manchester, Greater Manchester, M15",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300132",
      companyName: "Evergreen Operator Consulting Ltd",
      incorporationDate: "2026-06-03",
      location: "London, Greater London, EC4A",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300133",
      companyName: "Oak Court Estates Ltd",
      incorporationDate: "2026-06-03",
      location: "Bristol, Bristol, BS6",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300134",
      companyName: "Pattern Foundry Software Ltd",
      incorporationDate: "2026-06-02",
      location: "London, Greater London, E8",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300135",
      companyName: "Northgate Commercial Advisory Ltd",
      incorporationDate: "2026-06-02",
      location: "Leeds, West Yorkshire, LS12",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300136",
      companyName: "Maple & Quay Property Ltd",
      incorporationDate: "2026-06-02",
      location: "Manchester, Greater Manchester, M20",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300137",
      companyName: "Parallel Kernel Systems Ltd",
      incorporationDate: "2026-06-02",
      location: "London, Greater London, SW1",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300138",
      companyName: "Westpoint Advisory Services Ltd",
      incorporationDate: "2026-06-02",
      location: "Birmingham, West Midlands, B5",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300139",
      companyName: "Station Yard Property Partners Ltd",
      incorporationDate: "2026-06-02",
      location: "London, Greater London, N4",
      matchedSicCodes: ["68100"],
    },
    {
      companyNumber: "16300140",
      companyName: "Lattice Home Software Ltd",
      incorporationDate: "2026-06-01",
      location: "Newcastle upon Tyne, Tyne and Wear, NE1",
      matchedSicCodes: ["62012"],
    },
    {
      companyNumber: "16300141",
      companyName: "Prime Arc Consulting Ltd",
      incorporationDate: "2026-06-01",
      location: "London, Greater London, E17",
      matchedSicCodes: ["70229"],
    },
    {
      companyNumber: "16300142",
      companyName: "Cedar Park Lets Ltd",
      incorporationDate: "2026-06-01",
      location: "Bristol, Bristol, BS3",
      matchedSicCodes: ["68100"],
    },
  ],
}

export default function AlertResultsPreviewPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-md border-2 bg-[hsl(var(--chart-2))] shadow-[4px_4px_0_0_hsl(var(--foreground))]">
              <Radar className="size-7" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                UK Company Radar
              </p>
              <h1 className="text-3xl font-black tracking-normal sm:text-4xl">
                Results for {previewRun.periodStart} to {previewRun.periodEnd}
              </h1>
            </div>
          </div>

          <Badge
            className="inline-flex items-center gap-2 self-start px-3 py-1.5"
            variant="outline"
          >
            <Eye className="size-3.5" />
            Preview of the magic-link page
          </Badge>
        </div>

        <AlertResultsView run={previewRun} />
      </div>
    </main>
  )
}
