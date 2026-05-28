"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Printer,
  Share2,
  Mail,
  MapPin,
  Phone,
  Loader2,
  FileDown,
} from "lucide-react"
import { formatDate, formatTime, formatDateTime, generateReceiptNumber } from "@/lib/utils"
import { getVisitById, getClinicSettings } from "@/lib/actions"
import { toast } from "sonner"

type VisitData = {
  id: string
  dateTime: string
  stageNo: number
  sittingNo: number
  notes: string | null
  nextVisitDate: string | null
  visitStatus: string
  receiptNumber: string | null
  createdAt: string
  patient: {
    id: string
    name: string
    phone: string
    address: string
  }
  plan: {
    id: string
    condition: string
    stagesTotal: number
    sittingsTotal: number
    currentStage: number
    currentSittingNumber: number
    doctor: {
      name: string
    }
  } | null
  scheduleSlot?: {
    doctor: { name: string } | null
  } | null
}

type ClinicInfo = {
  name: string
  address: string
  phone: string
  email: string
}

export default function ReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const [visit, setVisit] = useState<VisitData | null>(null)
  const [clinic, setClinic] = useState<ClinicInfo>({
    name: "ZenFlow Clinic",
    address: "123 Healing Way, Wellness District",
    phone: "+1 (555) 123-4567",
    email: "noreply@srilalithasignaturenoodles.online",
  })
  const [loading, setLoading] = useState(true)
  const [receiptNumber, setReceiptNumber] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const id = params.id as string
        const [visitData, settings] = await Promise.all([
          getVisitById(id),
          getClinicSettings().catch(() => ({})),
        ])
        if (visitData) {
          setVisit(visitData as any)
          setReceiptNumber(
            (visitData as any).receiptNumber || generateReceiptNumber()
          )
        }
        if (settings && (settings as any).clinicName) {
          setClinic({
            name: (settings as any).clinicName || "ZenFlow Clinic",
            address: (settings as any).clinicAddress || clinic.address,
            phone: (settings as any).clinicPhone || clinic.phone,
            email: (settings as any).clinicEmail || clinic.email,
          })
        }
      } catch {
        toast.error("Failed to load receipt data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const standaloneUrl = params.id ? `/receipt/${params.id}` : ""

  const handlePrint = useCallback(() => {
    window.open(standaloneUrl, "_blank")
  }, [standaloneUrl])

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${standaloneUrl}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt - ${visit?.patient?.name || "Patient"}`,
          text: `Receipt #${receiptNumber}`,
          url,
        })
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    }
  }, [visit, receiptNumber, standaloneUrl])

  const handleEmail = useCallback(() => {
    if (!visit) return
    const url = `${window.location.origin}${standaloneUrl}`
    const subject = encodeURIComponent(
      `Receipt #${receiptNumber} - ${clinic.name}`
    )
    const body = encodeURIComponent(
      `Dear ${visit.patient.name},\n\nPlease find your visit receipt at the link below:\n${url}\n\nReceipt #: ${receiptNumber}\nDate: ${formatDateTime(visit.dateTime)}\nCondition: ${visit.plan?.condition || "N/A"}\n\nThank you for choosing ${clinic.name}.`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }, [visit, receiptNumber, clinic, standaloneUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Visit not found.
      </div>
    )
  }

  const visitType = visit.sittingNo === 1 && visit.stageNo === 1 ? "Initial" : "Follow-up"
  const practitioner = visit.plan?.doctor?.name || visit.scheduleSlot?.doctor?.name || "N/A"
  const progress = visit.plan
    ? `Stage ${visit.plan.currentStage}/${visit.plan.stagesTotal}, Sitting ${visit.plan.currentSittingNumber}/${visit.plan.sittingsTotal}`
    : "No active treatment plan"

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="no-print sticky top-0 z-10 bg-background border-b border-border px-4 py-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="default" size="sm" onClick={handlePrint}>
          <FileDown className="size-4 mr-1" />
          Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="size-4 mr-1" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={handleEmail}>
          <Mail className="size-4 mr-1" />
          Email
        </Button>
      </div>

      <div className="max-w-[210mm] mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-lg border border-border print:shadow-none print:border-none" id="print-area">
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{clinic.name}</h1>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {clinic.address}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {clinic.phone}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {clinic.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">
                  Receipt
                </h2>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  #{receiptNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(visit.createdAt)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Patient Information
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{visit.patient.name}</p>
                  <p className="text-muted-foreground">{visit.patient.phone}</p>
                  <p className="text-muted-foreground">{visit.patient.address}</p>
                  <p className="text-xs text-muted-foreground">ID: {visit.patient.id.slice(0, 8)}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Practitioner
                </h3>
                <p className="text-sm font-medium">
                  {practitioner}
                </p>
                {visit.plan && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {visit.plan.condition}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Visit Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span className="font-medium">{formatDateTime(visit.dateTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{visitType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progress}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stage / Sitting</span>
                    <span className="font-medium">
                      {visit.stageNo} / {visit.sittingNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phase</span>
                    <span className="font-medium">
                      {visit.plan
                        ? `Stage ${visit.stageNo} of ${visit.plan.stagesTotal}`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Session Summary
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Treatment session completed as per the active treatment plan.
              </p>
            </div>

            {visit.nextVisitDate && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Next Appointment
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date</span>
                    <p className="font-semibold">{formatDate(visit.nextVisitDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time</span>
                    <p className="font-semibold">{formatTime(visit.nextVisitDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Room</span>
                    <p className="font-semibold">TBD</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Care Instructions
              </h3>
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p>• Stay hydrated after your session</p>
                <p>• Avoid strenuous activity for 24 hours</p>
                <p>• Apply heat to treated areas if sore</p>
                <p>• Follow your treatment plan schedule</p>
                <p>• Contact the clinic if you experience any unusual symptoms</p>
              </div>
            </div>

            <Separator />

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground italic">
                Thank you for your visit. We wish you wellness and balance.
              </p>
              <div className="flex justify-center">
                <div className="size-20 bg-muted rounded flex items-center justify-center text-[8px] text-muted-foreground">
                  QR Code
                  <br />
                  Placeholder
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Receipt #{receiptNumber} | {formatDate(visit.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
