"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/features/status-badge"
import {
  Calendar,
  Clock,
  User,
  Printer,
  Edit,
  Trash2,
  ArrowLeft,
  FileText,
  MapPin,
} from "lucide-react"
import { formatDate, formatDateTime, formatTime } from "@/lib/utils"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import { cancelVisit } from "@/lib/actions"

type VisitPatient = {
  id: string
  name: string
  phone: string
  address: string
}

type VisitPlan = {
  id: string
  condition: string
  stagesTotal: number
  sittingsTotal: number
  currentStage: number
  currentSittingNumber: number
  doctor: {
    name: string
  }
}

type VisitData = {
  id: string
  dateTime: string
  stageNo: number
  sittingNo: number
  notes: string | null
  nextVisitDate: string | null
  visitStatus: string
  receiptNumber: string | null
  patient: VisitPatient
  plan: VisitPlan | null
  scheduleSlot?: { overrideReason: string | null } | null
}

const isPlanSession = (v: VisitData) =>
  v.plan && v.scheduleSlot?.overrideReason?.startsWith("plan-session:")

const visitTypeLabel = (visit: VisitData): string => {
  if (!isPlanSession(visit)) return "Appointment Visit"
  if (visit.sittingNo === 1 && visit.stageNo === 1) return "Initial Visit"
  return "Follow-up Visit"
}

export function VisitDetailClient({ visit }: { visit: VisitData }) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)

  const handleCancelVisit = async () => {
    try {
      await cancelVisit(visit.id)
      toast.success("Visit cancelled")
      setCancelOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to cancel visit")
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
        <div className="flex-1" />
        <Link href={`/visits/${visit.id}/receipt`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Printer className="size-4" />
            Print Receipt
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Edit visit coming soon")}>
          <Edit className="size-4" />
          Edit Visit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          onClick={() => setCancelOpen(true)}
        >
          <Trash2 className="size-4" />
          Cancel Visit
        </Button>
      </div>

      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {visitTypeLabel(visit)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDateTime(visit.dateTime)}
            </p>
          </div>
          <StatusBadge status={visit.visitStatus} className="text-sm" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="size-4" />
              Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              href={`/patients/${visit.patient.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {visit.patient.name}
            </Link>
            <p className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {visit.patient.address}
            </p>
            <p className="text-muted-foreground">{visit.patient.phone}</p>
            <p className="text-xs text-muted-foreground">
              ID: {visit.patient.id.slice(0, 8)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="size-4" />
              Treatment Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isPlanSession(visit) ? (
              <>
                <Link
                  href={`/plans/${visit.plan!.id}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {visit.plan!.condition}
                </Link>
                <p className="text-muted-foreground">
                  Stage {visit.plan!.currentStage}/{visit.plan!.stagesTotal} &middot; Sitting{" "}
                  {visit.plan!.currentSittingNumber}/{visit.plan!.sittingsTotal}
                </p>
                <p className="text-muted-foreground">
                  Practitioner: {visit.plan!.doctor.name}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No treatment plan linked</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="size-4" />
            Visit Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground">Date & Time</span>
                <p className="font-medium">{formatDateTime(visit.dateTime)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Stage</span>
                <p className="font-medium">{isPlanSession(visit) ? visit.stageNo : "—"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground">Sitting</span>
                <p className="font-medium">{isPlanSession(visit) ? visit.sittingNo : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Receipt #</span>
                <p className="font-medium font-mono">
                  {visit.receiptNumber || "—"}
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <h4 className="text-sm font-medium mb-2">Visit Notes</h4>
            {visit.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {visit.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes recorded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {visit.nextVisitDate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
              <Clock className="size-4" />
              Next Visit
            </CardTitle>
            <CardDescription>Scheduled follow-up appointment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Date</span>
                <p className="font-semibold">{formatDate(visit.nextVisitDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Time</span>
                <p className="font-semibold">{formatTime(visit.nextVisitDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Visit</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this visit? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep Visit
            </Button>
            <Button variant="destructive" onClick={handleCancelVisit}>
              Cancel Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
