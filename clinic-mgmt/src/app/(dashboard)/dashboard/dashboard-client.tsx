"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, Plus, AlertCircle, Activity, UserPlus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type DashboardStats = {
  todayVisits: number
  activePlans: number
  newPatients: number
  overdueCount: number
  totalPatients: number
}

const statCards = [
  { key: "todayVisits", label: "Today's Visits", icon: Calendar, color: "text-blue-600 bg-blue-50" },
  { key: "activePlans", label: "Active Plans", icon: Activity, color: "text-emerald-600 bg-emerald-50" },
  { key: "newPatients", label: "New Patients (Today)", icon: UserPlus, color: "text-violet-600 bg-violet-50" },
  { key: "overdueCount", label: "Overdue", icon: AlertCircle, color: "text-red-600 bg-red-50" },
] as const

export function DashboardClient({
  stats,
  clinicName,
}: {
  stats: DashboardStats
  clinicName: string
}) {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{clinicName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here is your practice overview for today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <div className={cn("rounded-lg p-2", color)}>
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {String(stats[key as keyof DashboardStats])}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/patients/new">
            <Button className="gap-2">
              <Plus className="size-4" />
              New Patient
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="gap-2">
              <Calendar className="size-4" />
              View Calendar
            </Button>
          </Link>
          <Link href="/patients">
            <Button variant="outline" className="gap-2">
              <Users className="size-4" />
              All Patients
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Patients</CardTitle>
          <CardDescription>Lifetime patient count in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalPatients}</div>
        </CardContent>
      </Card>
    </div>
  )
}
