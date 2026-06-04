import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center justify-end gap-2", className)}
      {...props}
    />
  )
}

function PaginationPrevious(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="sm" {...props}>
      <ChevronLeft data-icon="inline-start" />
      Previous
    </Button>
  )
}

function PaginationNext(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="sm" {...props}>
      Next
      <ChevronRight data-icon="inline-end" />
    </Button>
  )
}

export { Pagination, PaginationPrevious, PaginationNext }
