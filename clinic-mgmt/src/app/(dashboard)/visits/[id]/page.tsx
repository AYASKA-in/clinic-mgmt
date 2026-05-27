import { getVisitById } from "@/lib/actions"
import { notFound } from "next/navigation"
import { VisitDetailClient } from "./visit-detail-client"

export const dynamic = "force-dynamic"

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const visit = await getVisitById(id)

  if (!visit) {
    notFound()
  }

  return <VisitDetailClient visit={visit as any} />
}
