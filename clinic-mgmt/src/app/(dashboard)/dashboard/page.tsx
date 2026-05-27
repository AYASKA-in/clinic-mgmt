import { getDashboardStats } from "@/lib/actions"
import { Suspense } from "react"
import { DashboardClient } from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading dashboard...</div>}>
      <DashboardClient stats={stats} clinicName="ZenFlow Clinic" />
    </Suspense>
  )
}
