"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, GitCompare, RotateCcw, Check, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/features/status-badge"
import { formatDate } from "@/lib/utils"
import { updateTreatmentPlan } from "@/lib/actions"
import Link from "next/link"

type PlanVersion = {
  id: string
  version: number
  stagesTotal: number
  sittingsTotal: number
  intervalDays: number
  condition: string
  specialNotes: string | null
  plannedVisitDates: string | null
  expectedEndDate: Date | null
  status: string
  changeNotes: string | null
  createdAt: Date
}

type Plan = {
  id: string
  version: number
  condition: string
  patientId: string
  stagesTotal: number
  sittingsTotal: number
  intervalDays: number
  status: string
  versions: PlanVersion[]
}

export default function PlanVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [compareLeft, setCompareLeft] = useState<number | null>(null)
  const [compareRight, setCompareRight] = useState<number | null>(null)
  const [restoring, setRestoring] = useState<number | null>(null)

  const fetchPlan = useCallback(async () => {
    const { id } = await params
    const mod = await import("@/lib/actions")
    const result = await mod.getTreatmentPlanById(id)
    if (result) {
      setPlan({
        id: result.id,
        version: result.version,
        condition: result.condition,
        patientId: result.patientId,
        stagesTotal: result.stagesTotal,
        sittingsTotal: result.sittingsTotal,
        intervalDays: result.intervalDays,
        status: result.status,
        versions: result.versions as PlanVersion[],
      })
    }
    setLoading(false)
  }, [params])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  async function handleRestore(version: PlanVersion) {
    if (!plan) return
    setRestoring(version.version)
    try {
      await updateTreatmentPlan(plan.id, {
        stagesTotal: version.stagesTotal,
        sittingsTotal: version.sittingsTotal,
        intervalDays: version.intervalDays,
        condition: version.condition,
        specialNotes: version.specialNotes,
        plannedVisitDates: version.plannedVisitDates,
        expectedEndDate: version.expectedEndDate
          ? new Date(version.expectedEndDate).toISOString()
          : null,
        changeNotes: `Restored from version ${version.version}`,
      })
      toast.success(`Version ${version.version} restored successfully.`)
      router.refresh()
      fetchPlan()
    } catch {
      toast.error("Failed to restore version.")
    } finally {
      setRestoring(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading version history...</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Plan not found.</p>
        <Link href="/patients">
          <Button variant="outline" className="mt-4">Back to Patients</Button>
        </Link>
      </div>
    )
  }

  const leftVersion = compareLeft ? plan.versions.find((v) => v.version === compareLeft) : null
  const rightVersion = compareRight ? plan.versions.find((v) => v.version === compareRight) : null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/plans/${plan.id}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Plan Version History</h1>
          <p className="text-sm text-muted-foreground">
            {plan.condition} &mdash; {plan.versions.length} version{plan.versions.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">All Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {plan.versions.map((version, idx) => {
                const isActiveVersion = version.version === plan.version
                return (
                  <div key={version.id}>
                    {idx > 0 && <Separator />}
                    <div
                      className={`flex items-start gap-4 py-4 ${
                        isActiveVersion ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`size-3 rounded-full flex items-center justify-center ${
                            isActiveVersion ? "bg-primary/20" : "bg-muted"
                          }`}
                        >
                          <div
                            className={`size-1.5 rounded-full ${
                              isActiveVersion ? "bg-primary" : "bg-muted-foreground/40"
                            }`}
                          />
                        </div>
                        {idx < plan.versions.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Version {version.version}
                              </span>
                              {isActiveVersion && (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                                  <Check className="size-2.5 mr-0.5" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(version.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="xs"
                              className="gap-1"
                              onClick={() => {
                                if (compareLeft === version.version) {
                                  setCompareLeft(null)
                                } else if (!compareLeft) {
                                  setCompareLeft(version.version)
                                } else if (!compareRight && compareLeft !== version.version) {
                                  setCompareRight(version.version)
                                } else {
                                  setCompareLeft(version.version)
                                  setCompareRight(null)
                                }
                              }}
                            >
                              <GitCompare className="size-3" />
                              Compare
                            </Button>
                            {!isActiveVersion && (
                              <Button
                                variant="outline"
                                size="xs"
                                className="gap-1"
                                disabled={restoring === version.version}
                                onClick={() => handleRestore(version)}
                              >
                                <RotateCcw className="size-3" />
                                {restoring === version.version ? "Restoring..." : "Restore"}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="rounded bg-muted px-2 py-1">
                            <span className="text-muted-foreground">Stages: </span>
                            {version.stagesTotal}
                          </div>
                          <div className="rounded bg-muted px-2 py-1">
                            <span className="text-muted-foreground">Sittings: </span>
                            {version.sittingsTotal}
                          </div>
                          <div className="rounded bg-muted px-2 py-1">
                            <span className="text-muted-foreground">Interval: </span>
                            {version.intervalDays}d
                          </div>
                          <div className="rounded bg-muted px-2 py-1">
                            <StatusBadge status={version.status} />
                          </div>
                        </div>

                        {version.changeNotes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            &ldquo;{version.changeNotes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {leftVersion && rightVersion && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitCompare className="size-4" />
                Comparing v{leftVersion.version} vs v{rightVersion.version}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Version {leftVersion.version}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Condition</span>
                      <span>{leftVersion.condition}</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Stages</span>
                      <span>{leftVersion.stagesTotal}</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Sittings</span>
                      <span>{leftVersion.sittingsTotal}</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Interval</span>
                      <span>{leftVersion.intervalDays} days</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={leftVersion.status} />
                    </div>
                    {leftVersion.specialNotes && (
                      <div className="rounded bg-muted px-3 py-1.5">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{leftVersion.specialNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Version {rightVersion.version}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Condition</span>
                      <span>{rightVersion.condition}</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Stages</span>
                      <span>{rightVersion.stagesTotal}</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Sittings</span>
                      <span>{rightVersion.sittingsTotal}</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Interval</span>
                      <span>{rightVersion.intervalDays} days</span>
                    </div>
                    <div className="flex justify-between rounded bg-muted px-3 py-1.5">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={rightVersion.status} />
                    </div>
                    {rightVersion.specialNotes && (
                      <div className="rounded bg-muted px-3 py-1.5">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{rightVersion.specialNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-4" />
                <span>
                  v{leftVersion.version}: &ldquo;{leftVersion.changeNotes || "No notes"}&rdquo;
                </span>
                <span>&rarr;</span>
                <span>
                  v{rightVersion.version}: &ldquo;{rightVersion.changeNotes || "No notes"}&rdquo;
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
