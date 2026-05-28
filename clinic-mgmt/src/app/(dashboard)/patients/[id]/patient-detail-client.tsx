"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Edit,
  Plus,
  CalendarPlus,
  Printer,
  Bell,
  Calendar,
  Phone,
  Activity,
  History,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { toast } from "sonner"
import { sendReminderNow } from "@/lib/actions"
import { REMINDER_TEMPLATES } from "@/lib/constants"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/features/status-badge"
import { cn, formatDate, formatDateTime, getInitials } from "@/lib/utils"

type Patient = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions").getPatientById>>>

export function PatientDetailClient({
  patient,
  doctors,
}: {
  patient: Patient
  doctors: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const activePlan = patient.treatmentPlans.find((p) => p.status === "active")
  const latestVisit = patient.visits[0]

  async function handleSendReminder(template: string) {
    try {
      await sendReminderNow(patient.id, template)
      const label = REMINDER_TEMPLATES.find((t) => t.id === template)?.label || template
      toast.success(`${label} sent successfully.`)
    } catch (e: any) {
      toast.error(e.message || "Failed to send reminder.")
    }
  }

  function handlePrintReceipt() {
    if (latestVisit) {
      router.push(`/visits/${latestVisit.id}/receipt`)
    } else {
      toast.error("No visits found for this patient.")
    }
  }

  function handleScheduleVisit() {
    router.push(`/schedule?patientId=${patient.id}`)
  }

  function handleScheduleSitting() {
    router.push(`/schedule?patientId=${patient.id}`)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/patients">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Patient Details</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {getInitials(patient.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{patient.name}</h2>
                <p className="text-sm text-muted-foreground">
                  ID: {patient.id.slice(0, 8).toUpperCase()}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {patient.dateOfBirth && (
                    <span className="text-muted-foreground">
                      DOB: {formatDate(patient.dateOfBirth)}
                    </span>
                  )}
                  {patient.age && <span className="text-muted-foreground">{patient.age} yrs</span>}
                  {patient.gender && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {patient.gender}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{patient.email}</span>
                  </div>
                )}
                {activePlan && <StatusBadge status={activePlan.status} className="mt-2" />}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/patients/${patient.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="size-3.5" />
                  Edit
                </Button>
              </Link>
              <Link href={`/plans/new?patientId=${patient.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
                  Create Plan
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleScheduleVisit}>
                <CalendarPlus className="size-3.5" />
                Schedule Visit
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrintReceipt}>
                <Printer className="size-3.5" />
                Print Receipt
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <Bell className="size-3.5" />
                  Send Reminder
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {REMINDER_TEMPLATES.map((t) => (
                    <DropdownMenuItem key={t.id} onClick={() => handleSendReminder(t.id)}>
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {latestVisit?.nextVisitDate && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5 text-sm">
              <Calendar className="size-4 text-primary" />
              <span className="font-medium">Next Visit:</span>
              <span>{formatDateTime(latestVisit.nextVisitDate)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="treatment-plan" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="treatment-plan" className="gap-1.5">
            <Activity className="size-3.5" />
            Treatment Plan
          </TabsTrigger>
          <TabsTrigger value="visit-history" className="gap-1.5">
            <History className="size-3.5" />
            Visit History
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-1.5">
            <Bell className="size-3.5" />
            Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="treatment-plan" className="mt-6 space-y-6">
          {activePlan ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Current Plan</CardTitle>
                    <CardDescription>{activePlan.condition}</CardDescription>
                  </div>
                  <StatusBadge status={activePlan.status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">
                        Stage {activePlan.currentStage} of {activePlan.stagesTotal}
                      </span>
                      <span className="text-muted-foreground">
                        Sitting {activePlan.currentSittingNumber} of {activePlan.sittingsTotal}
                      </span>
                    </div>
                    <Progress
                      value={(activePlan.currentStage / activePlan.stagesTotal) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-1">
                    {Array.from({ length: activePlan.stagesTotal }, (_, i) => {
                      const stageNo = i + 1
                      const isActive = stageNo === activePlan.currentStage
                      const isCompleted = stageNo < activePlan.currentStage
                      return (
                        <div
                          key={stageNo}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                            isActive && "bg-primary/5 border border-primary/10",
                            isCompleted && "text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          ) : isActive ? (
                            <Activity className="size-4 text-primary shrink-0" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={cn(isActive && "font-medium")}>
                            Stage {stageNo} &mdash; {activePlan.condition}
                          </span>
                          {isActive && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" className="gap-1.5" onClick={handleScheduleSitting}>
                      <CalendarPlus className="size-3.5" />
                      Schedule Next Sitting
                    </Button>
                    <Link href={`/plans/${activePlan.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        View Full Plan
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No active treatment plan.</p>
                <Link href={`/plans/new?patientId=${patient.id}`}>
                  <Button className="mt-4 gap-1.5">
                    <Plus className="size-4" />
                    Create New Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="visit-history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visit History</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.visits.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No visits recorded yet.
                </p>
              ) : (
                <div className="space-y-0">
                  {patient.visits.map((visit, idx) => (
                    <div key={visit.id}>
                      {idx > 0 && <Separator />}
                      <div className="flex items-start gap-4 py-4">
                        <div className="flex flex-col items-center">
                          <div className="size-3 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="size-1.5 rounded-full bg-primary" />
                          </div>
                          {idx < patient.visits.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {visit.plan && visit.scheduleSlot?.overrideReason?.startsWith("plan-session:")
                                  ? `Stage ${visit.stageNo}, Sitting ${visit.sittingNo}`
                                  : "Appointment Visit"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(visit.dateTime)}
                              </p>
                            </div>
                            <StatusBadge status={visit.visitStatus} />
                          </div>
                          {visit.plan?.condition && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {visit.plan.condition}
                            </p>
                          )}
                          {visit.notes && (
                            <p className="text-sm mt-2 text-muted-foreground">{visit.notes}</p>
                          )}
                          {visit.nextVisitDate && (
                            <p className="text-xs text-emerald-600 mt-1">
                              Next: {formatDate(visit.nextVisitDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No reminders sent.
                </p>
              ) : (
                <div className="space-y-3">
                  {patient.reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start justify-between rounded-lg border border-border p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium capitalize">{reminder.channel}</p>
                        <p className="text-xs text-muted-foreground">
                          Template: {reminder.template}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Scheduled: {formatDateTime(reminder.sendAt)}
                        </p>
                      </div>
                      <StatusBadge status={reminder.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
