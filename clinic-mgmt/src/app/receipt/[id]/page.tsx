"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Printer, Loader2, MapPin, Phone, Mail } from "lucide-react"
import { formatDate, formatTime, formatDateTime, generateReceiptNumber } from "@/lib/utils"
import { getVisitById, getClinicSettings } from "@/lib/actions"

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
  patient: { id: string; name: string; phone: string; address: string }
  plan: {
    id: string; condition: string
    stagesTotal: number; sittingsTotal: number
    currentStage: number; currentSittingNumber: number
    doctor: { name: string }
  } | null
  scheduleSlot?: { doctor: { name: string } | null } | null
}

export default function StandaloneReceiptPage() {
  const params = useParams()
  const [visit, setVisit] = useState<VisitData | null>(null)
  const [clinic, setClinic] = useState({ name: "ZenFlow Clinic", address: "123 Healing Way, Wellness District", phone: "+1 (555) 123-4567", email: "noreply@srilalithasignaturenoodles.online" })
  const [loading, setLoading] = useState(true)
  const [receiptNumber, setReceiptNumber] = useState("")
  const [printed, setPrinted] = useState(false)

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
          setReceiptNumber((visitData as any).receiptNumber || generateReceiptNumber())
        }
        if (settings && (settings as any).clinicName) {
          setClinic({
            name: (settings as any).clinicName || "ZenFlow Clinic",
            address: (settings as any).clinicAddress || clinic.address,
            phone: (settings as any).clinicPhone || clinic.phone,
            email: (settings as any).clinicEmail || clinic.email,
          })
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  useEffect(() => {
    if (!loading && visit) {
      const timer = setTimeout(() => {
        window.print()
        setPrinted(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, visit])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!visit) {
    return <div className="p-6 text-center text-muted-foreground">Visit not found.</div>
  }

  const visitType = visit.sittingNo === 1 && visit.stageNo === 1 ? "Initial" : "Follow-up"
  const duration = visit.plan
    ? `Stage ${visit.plan.currentStage}/${visit.plan.stagesTotal}, Sitting ${visit.plan.currentSittingNumber}/${visit.plan.sittingsTotal}`
    : "—"

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {!printed && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center gap-3 no-print">
          <Button onClick={() => { window.print(); setPrinted(true) }}>
            <Printer className="size-4 mr-1.5" />
            Save / Print Receipt
          </Button>
        </div>
      )}

      <div className="max-w-[210mm] mx-auto py-8 px-4 print:py-4 print:px-0">
        <div className="bg-white print:shadow-none print:border-none" id="receipt-content">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{clinic.name}</h1>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {clinic.address}</p>
                  <p className="flex items-center gap-1.5"><Phone className="size-3.5" /> {clinic.phone}</p>
                  <p className="flex items-center gap-1.5"><Mail className="size-3.5" /> {clinic.email}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-semibold text-gray-500 uppercase tracking-wider">Receipt</h2>
                <p className="text-sm font-mono text-gray-500 mt-1">#{receiptNumber}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(visit.createdAt)}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Patient Information</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{visit.patient.name}</p>
                  <p className="text-gray-600">{visit.patient.phone}</p>
                  <p className="text-gray-600">{visit.patient.address}</p>
                  <p className="text-xs text-gray-400">ID: {visit.patient.id.slice(0, 8)}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Practitioner</h3>
                <p className="text-sm font-medium">{visit.plan?.doctor?.name || visit.scheduleSlot?.doctor?.name || "N/A"}</p>
                {(visit.plan?.condition) && <p className="text-xs text-gray-500 mt-1">{visit.plan.condition}</p>}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Visit Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Date & Time</span><span className="font-medium">{formatDateTime(visit.dateTime)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{visitType}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{duration}</span></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Stage / Sitting</span><span className="font-medium">{visit.stageNo} / {visit.sittingNo}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Phase</span><span className="font-medium">{visit.plan ? `Stage ${visit.stageNo} of ${visit.plan.stagesTotal}` : "N/A"}</span></div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Session Summary</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">Treatment session completed as per the active treatment plan.</p>
            </div>

            {visit.nextVisitDate && (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Next Appointment</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Date</span><p className="font-semibold">{formatDate(visit.nextVisitDate)}</p></div>
                  <div><span className="text-gray-500">Time</span><p className="font-semibold">{formatTime(visit.nextVisitDate)}</p></div>
                  <div><span className="text-gray-500">Room</span><p className="font-semibold">TBD</p></div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Care Instructions</h3>
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 space-y-1">
                <p>• Stay hydrated after your session</p>
                <p>• Avoid strenuous activity for 24 hours</p>
                <p>• Apply heat to treated areas if sore</p>
                <p>• Follow your treatment plan schedule</p>
                <p>• Contact the clinic if you experience any unusual symptoms</p>
              </div>
            </div>

            <Separator />

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-500 italic">Thank you for your visit. We wish you wellness and balance.</p>
              <p className="text-[10px] text-gray-400">Receipt #{receiptNumber} | {formatDate(visit.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
    </div>
  )
}