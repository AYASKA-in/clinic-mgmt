"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  Calendar,
  User,
  Clock,
  Loader2,
  Users,
} from "lucide-react"
import { StatusBadge } from "@/components/features/status-badge"
import { formatDate, getInitials, cn } from "@/lib/utils"
import { getOverduePatients } from "@/lib/actions"

type OverduePatient = {
  id: string
  name: string
  phone: string
  lastVisit: Date | null
  daysOverdue: number
  intervalDays: number
  urgency: "high" | "medium" | "low"
  assignedDoctor: string
}

function calculateUrgency(daysOverdue: number, intervalDays: number): OverduePatient["urgency"] {
  if (daysOverdue > intervalDays * 2) return "high"
  if (daysOverdue > intervalDays) return "medium"
  return "low"
}

const urgencyColor: Record<string, string> = {
  high: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  medium: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
  low: "bg-slate-50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-800",
}

const urgencyBadge: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400",
}

export default function OverduePage() {
  const [patients, setPatients] = useState<OverduePatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const result = await getOverduePatients()
        const mapped: OverduePatient[] = result.map((p: any) => {
          const lastVisit = p.visits?.[0] ?? null
          const plan = p.treatmentPlans?.[0] ?? null
          const now = new Date()
          const lastVisitDate = lastVisit ? new Date(lastVisit.dateTime) : null
          const daysOverdue = lastVisitDate
            ? Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0
          const intervalDays = plan?.intervalDays ?? 30
          return {
            id: p.id,
            name: p.name,
            phone: p.phone,
            lastVisit: lastVisitDate,
            daysOverdue,
            intervalDays,
            urgency: calculateUrgency(daysOverdue, intervalDays),
            assignedDoctor: plan?.doctor?.name || "Unassigned",
          }
        })
        mapped.sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 }
          return order[a.urgency] - order[b.urgency]
        })
        setPatients(mapped)
      } catch (e: any) {
        setError(e.message || "Failed to load overdue patients")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = {
    total: patients.length,
    requiresCall: patients.filter((p) => p.urgency === "high").length,
    highestUrgency: patients[0]?.urgency ?? "none",
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="size-8 mx-auto mb-3 text-destructive" />
            <p className="text-destructive font-medium">Failed to load data</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Overdue Follow-ups</h1>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-sm px-3 py-1">
              {stats.total} Overdue
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Patients past their scheduled follow-up interval.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Requires Call</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.requiresCall}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold capitalize">{stats.highestUrgency}</div>
              {stats.highestUrgency === "high" && <AlertTriangle className="size-5 text-red-500" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="size-10 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No patients are overdue for follow-ups.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <Card key={patient.id} className={cn("border-l-4", urgencyColor[patient.urgency])}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className={cn(
                      "text-sm font-medium",
                      patient.urgency === "high" && "bg-red-100 text-red-700",
                      patient.urgency === "medium" && "bg-amber-100 text-amber-700",
                      patient.urgency === "low" && "bg-slate-100 text-slate-600",
                    )}>
                      {getInitials(patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium truncate">{patient.name}</h3>
                        <p className="text-xs text-muted-foreground">{patient.phone}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", urgencyBadge[patient.urgency])}>
                        {patient.urgency === "high" ? "Urgent" : patient.urgency === "medium" ? "Overdue" : "Approaching"}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-3.5 shrink-0" />
                        <span>Last visit: {formatDate(patient.lastVisit)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="size-3.5 shrink-0" />
                        <span>
                          <span className={cn("font-medium", patient.urgency === "high" && "text-red-600")}>
                            {patient.daysOverdue} days
                          </span>{" "}
                          overdue (interval: {patient.intervalDays}d)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="size-3.5 shrink-0" />
                        <span>{patient.assignedDoctor}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="default" className="gap-1.5 h-8">
                        <Phone className="size-3.5" />
                        Call
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8">
                        <MessageSquare className="size-3.5" />
                        Message
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8">
                        <Calendar className="size-3.5" />
                        Reschedule
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1.5 h-8">
                        <User className="size-3.5" />
                        Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
