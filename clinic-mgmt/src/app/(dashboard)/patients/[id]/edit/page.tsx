import { getPatientById } from "@/lib/actions"
import { notFound } from "next/navigation"
import { EditPatientClient } from "./edit-patient-client"

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = await getPatientById(id)
  if (!patient) notFound()

  return <EditPatientClient patient={patient as any} />
}
