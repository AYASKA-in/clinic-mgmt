"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Edit,
  CalendarPlus,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Calendar,
  User,
  Trash2,
  Loader2,
} from "lucide-react"
import { StatusBadge } from "@/components/features/status-badge"
import { cn, formatDate, getInitials } from "@/lib/utils"
import { deletePatient } from "@/lib/actions"
import { toast } from "sonner"

type Patient = {
  id: string
  name: string
  phone: string
  age: number | null
  gender: string | null
  address: string
  treatmentPlans: Array<{
    id: string
    status: string
    doctor: { name: string }
  }>
  visits: Array<{
    id: string
    dateTime: Date
    nextVisitDate: Date | null
  }>
}

type User = {
  id: string
  name: string
  role: string
}

export function PatientsClient({
  patients,
  total,
  page,
  limit,
  users,
  search,
  statusFilter,
}: {
  patients: Patient[]
  total: number
  page: number
  limit: number
  users: User[]
  search?: string
  statusFilter?: string
}) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(search || "")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleDelete(patientId: string) {
    setDeletingId(patientId)
    try {
      await deletePatient(patientId)
      toast.success("Patient deleted successfully")
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete patient")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const buildUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams()
      const s = updates.search ?? searchValue
      if (s) params.set("search", s)
      if (updates.status) params.set("status", updates.status)
      if (updates.page) params.set("page", updates.page)
      return `/patients?${params.toString()}`
    },
    [searchValue]
  )

  function handleSearch() {
    router.push(buildUrl({ page: "1" }))
  }

  function handleStatusChange(value: string | null) {
    router.push(buildUrl({ status: value || undefined, page: "1" }))
  }

  function handlePageChange(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }))
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all registered patients.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="h-9 pl-8"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Link href="/patients/new">
          <Button className="gap-2 ml-auto">
            <User className="size-4" />
            New Patient
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {patients.map((patient) => {
          const activePlan = patient.treatmentPlans[0]
          const lastVisit = patient.visits[0]
          const status = activePlan?.status || "completed"

          return (
            <Card
              key={patient.id}
              className="group transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => router.push(`/patients/${patient.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="size-12 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-sm font-medium",
                        status === "active" && "bg-emerald-100 text-emerald-700",
                        status === "completed" && "bg-muted text-muted-foreground",
                        status === "overdue" && "bg-red-100 text-red-700",
                        status === "paused" && "bg-amber-100 text-amber-700"
                      )}
                    >
                      {getInitials(patient.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium truncate">{patient.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {patient.age ? `${patient.age} yrs` : ""}
                          {patient.age && patient.gender ? " / " : ""}
                          {patient.gender || ""}
                        </p>
                      </div>
                      <StatusBadge status={status} className="shrink-0" />
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{patient.phone}</span>
                      </div>
                      {lastVisit && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="size-3.5 shrink-0" />
                          <span>Last: {formatDate(lastVisit.dateTime)}</span>
                        </div>
                      )}
                      {lastVisit?.nextVisitDate && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="size-3.5 shrink-0 text-emerald-600" />
                          <span className="text-emerald-600">
                            Next: {formatDate(lastVisit.nextVisitDate)}
                          </span>
                        </div>
                      )}
                    </div>

                    {activePlan?.doctor && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="size-3.5" />
                        <span>{activePlan.doctor.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="hidden group-hover:flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/patients/${patient.id}/edit`}>
                      <Button variant="ghost" size="icon-sm">
                        <Edit className="size-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon-sm">
                      <CalendarPlus className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm">
                      <Bell className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDeleteId(patient.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {patients.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No patients found matching your criteria.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}&ndash;{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              This will permanently delete this patient and all associated data
              (visits, treatment plans, reminders, appointments). This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingId === confirmDeleteId}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {deletingId === confirmDeleteId && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
