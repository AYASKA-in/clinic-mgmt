import Link from "next/link"
import { getTodaySchedule } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/features/status-badge"
import { AppointmentSlotsTable } from "./appointment-slots"
import { Calendar, Clock, User } from "lucide-react"
import { cn, formatTime } from "@/lib/utils"

export const dynamic = "force-dynamic"

type VisitRow = {
  id: string
  dateTime: Date
  visitStatus: string
  patient: { name: string }
  plan: { condition: string } | null
}

export default async function SchedulePage() {
  const { visits, slots } = await getTodaySchedule()
  const freeSlots = slots.filter((s: any) => s.status === "free")

  const statusRowColor: Record<string, string> = {
    arrived: "bg-teal-50 dark:bg-teal-950/20 border-l-teal-500",
    in_treatment: "bg-blue-50 dark:bg-blue-950/20 border-l-blue-500",
    completed: "bg-muted/30 border-l-muted-foreground/20",
    scheduled: "bg-background border-l-primary/50",
    cancelled: "bg-destructive/5 border-l-destructive/30",
    no_show: "bg-orange-50 dark:bg-orange-950/20 border-l-orange-500",
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/calendar">
          <Button variant="outline" className="gap-2">
            <Calendar className="size-4" />
            View Full Schedule
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{visits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Arrived
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">
              {visits.filter((v: VisitRow) => v.visitStatus === "arrived").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">
              {visits.filter((v: VisitRow) => v.visitStatus === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit Schedule</CardTitle>
          <CardDescription>
            {visits.length > 0
              ? `${visits.length} visit${visits.length !== 1 ? "s" : ""} scheduled for today`
              : "No visits scheduled for today"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {visits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 w-32">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Time
                      </div>
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3.5" />
                        Patient
                      </div>
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
                      Treatment
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 w-32">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit: VisitRow) => (
                    <tr
                      key={visit.id}
                      className={cn(
                        "border-b border-border/50 transition-colors hover:bg-muted/50",
                        "border-l-4",
                        statusRowColor[visit.visitStatus] || "border-l-transparent"
                      )}
                    >
                      <td className="px-4 py-3 font-medium">
                        {formatTime(visit.dateTime)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/visits/${visit.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {visit.patient.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {visit.plan?.condition || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={visit.visitStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="size-8 mx-auto mb-3 opacity-50" />
              <p>No visits scheduled for today.</p>
              <Link href="/calendar">
                <Button variant="link" className="mt-2">
                  Go to Calendar
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentSlotsTable slots={freeSlots} />
    </div>
  )
}
