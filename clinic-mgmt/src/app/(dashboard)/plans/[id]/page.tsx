import { getTreatmentPlanById } from "@/lib/actions"
import { notFound } from "next/navigation"
import { PlanDetailClient } from "./plan-detail-client"

export const dynamic = "force-dynamic"

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const plan = await getTreatmentPlanById(id)
  if (!plan) notFound()

  return <PlanDetailClient plan={plan as any} />
}
