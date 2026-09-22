import { redirect } from "next/navigation"

export default function CompaniesRoute() {
  redirect("/app?view=companies")
}
