import { getPatientById, getDoctors } from "@/lib/actions"
import { notFound } from "next/navigation"
import { PatientDetailClient } from "./patient-detail-client"

export const dynamic = "force-dynamic"

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [patient, doctors] = await Promise.all([
    getPatientById(id),
    getDoctors(),
  ])

  if (!patient) notFound()

  return (
    <PatientDetailClient
      patient={patient as any}
      doctors={doctors as any}
    />
  )
}
