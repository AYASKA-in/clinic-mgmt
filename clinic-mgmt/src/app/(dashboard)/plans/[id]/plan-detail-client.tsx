"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Edit,
  Activity,
  Calendar,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/features/status-badge"
import { formatDate, formatDateTime } from "@/lib/utils"
import { SessionTimeline } from "./session-timeline"

type Plan = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions").getTreatmentPlanById>>>

export function PlanDetailClient({ plan }: { plan: Plan }) {
  const progressPct = plan.stagesTotal > 0
    ? Math.round((plan.currentStage / plan.stagesTotal) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/patients/${plan.patientId}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Treatment Plan</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{plan.condition}</h2>
                <StatusBadge status={plan.status} />
                <Badge variant="outline" className="text-xs">
                  v{plan.version}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Patient: {plan.patient.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Practitioner: {plan.doctor.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Created: {formatDate(plan.createdAt)}
              </p>
            </div>
            <Link href={`/plans/${plan.id}/versions`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit className="size-3.5" />
                Revise Plan
              </Button>
            </Link>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold mt-1">
                Stage {plan.currentStage} of {plan.stagesTotal}
              </p>
              <Progress value={progressPct} className="h-2 mt-2" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sittings</p>
              <p className="text-2xl font-bold mt-1">
                {plan.currentSittingNumber} of {plan.sittingsTotal}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Every {plan.intervalDays} days
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estimated End</p>
              <p className="text-2xl font-bold mt-1">
                {plan.expectedEndDate ? formatDate(plan.expectedEndDate) : "\u2014"}
              </p>
            </div>
          </div>

          {plan.specialNotes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{plan.specialNotes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SessionTimeline sessions={plan.sessions as any} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {Array.from({ length: plan.stagesTotal }, (_, i) => {
              const stageNo = i + 1
              const isActive = stageNo === plan.currentStage
              const isCompleted = stageNo < plan.currentStage
              return (
                <div
                  key={stageNo}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isActive ? "bg-primary/5 border border-primary/10" : ""
                  } ${isCompleted ? "text-muted-foreground" : ""}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  ) : isActive ? (
                    <Activity className="size-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={isActive ? "font-medium" : ""}>
                    Stage {stageNo}
                  </span>
                  {isActive && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit History</CardTitle>
          </CardHeader>
          <CardContent>
            {plan.visits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No visits yet.</p>
            ) : (
              <div className="space-y-3">
                {plan.visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="size-2 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        Sitting {visit.sittingNo} &mdash; Stage {visit.stageNo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(visit.dateTime)}
                      </p>
                      {visit.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{visit.notes}</p>
                      )}
                    </div>
                    <StatusBadge status={visit.visitStatus} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
          <CardDescription>
            {plan.versions.length} version{plan.versions.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {plan.versions.map((version, idx) => (
              <div key={version.id}>
                {idx > 0 && <Separator />}
                <div className="flex items-start gap-4 py-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-3 rounded-full flex items-center justify-center ${
                        version.status === "active" ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <div
                        className={`size-1.5 rounded-full ${
                          version.status === "active" ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                    </div>
                    {idx < plan.versions.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Version {version.version}
                        {version.status === "active" && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Active
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {version.changeNotes || "No change notes"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {version.stagesTotal} stages, {version.sittingsTotal} sittings, {version.intervalDays} day intervals
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
