import { getPatients, getDoctors } from "@/lib/actions"
import { PatientsClient } from "./patients-client"

export const dynamic = "force-dynamic"

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const limit = 20
  const offset = (page - 1) * limit

  const [{ patients, total }, doctors] = await Promise.all([
    getPatients({
      search: params.search,
      status: params.status,
      limit,
      offset,
    }),
    getDoctors(),
  ])

  return (
    <PatientsClient
      patients={patients as any}
      total={total}
      page={page}
      limit={limit}
      users={doctors as any}
      search={params.search}
      statusFilter={params.status}
    />
  )
}
