"use server"

import prisma from "@/lib/db"
import { createAuditLog } from "@/lib/audit"
import { hashPassword, requireAuth as _requireAuth, requireRole as _requireRole } from "@/lib/auth"
import { withCache, clearCache } from "@/lib/cache"
import { toDateIST, istMidnightUTC } from "@/lib/utils"
import { cache } from "react"

const requireAuth = cache(_requireAuth)
const requireRole = cache(_requireRole)
import { sendEmail, buildReminderEmail } from "@/lib/notifications/email"

function logAudit(params: {
  actorId?: string
  entityType: string
  entityId?: string
  action: string
  before?: any
  after?: any
  ipOrDevice?: string
}) {
  createAuditLog(params).catch(() => {})
}

function isPastDate(date: Date): boolean {
  return date.getTime() < istMidnightUTC().getTime()
}

export async function getUsers() {
  await requireRole("admin")
  return withCache("users", 30_000, () =>
    prisma.user.findMany({ orderBy: { name: "asc" } })
  )
}

export async function getDoctors() {
  await requireAuth()
  return withCache("doctors", 60_000, () =>
    prisma.user.findMany({
      where: { role: "doctor", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    })
  )
}

export async function getUserById(id: string) {
  await requireRole("admin")
  return prisma.user.findUnique({ where: { id } })
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: string
  active?: boolean
}) {
  try {
    const session = await requireRole("admin")
    if (data.password.length < 6) throw new Error("Password must be at least 6 characters")
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        active: data.active ?? true,
        passwordHash: await hashPassword(data.password),
      },
    })
    logAudit({
      actorId: session.id,
      entityType: "User",
      entityId: user.id,
      action: "create",
      after: { name: data.name, email: data.email, role: data.role },
    })
    clearCache("users")
    clearCache("doctors")
    return user
  } catch (e: any) {
    throw new Error(e.message || "Failed to create user")
  }
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; role?: string; active?: boolean; password?: string }
) {
  try {
    const session = await requireRole("admin")
    const before = await prisma.user.findUnique({ where: { id } })
    if (!before) throw new Error("User not found")
    if (session.id === id && data.active === false) throw new Error("Cannot deactivate yourself")
    if (session.id === id && data.role && data.role !== before.role) throw new Error("Cannot change your own role")

    const updateData: any = { ...data }
    if (data.password) {
      if (data.password.length < 6) throw new Error("Password must be at least 6 characters")
      updateData.passwordHash = await hashPassword(data.password)
    }
    delete updateData.password

    const user = await prisma.user.update({ where: { id }, data: updateData })
    logAudit({
      actorId: session.id,
      entityType: "User",
      entityId: id,
      action: "update",
      before: { role: before.role, active: before.active },
      after: { role: user.role, active: user.active },
    })
    clearCache("users")
    clearCache("doctors")
    return user
  } catch (e: any) {
    throw new Error(e.message || "Failed to update user")
  }
}

export async function getPatients(params: {
  search?: string
  status?: string
  doctorId?: string
  limit?: number
  offset?: number
}) {
  await requireAuth()
  const cacheKey = `patients:${params.search || ""}:${params.status || "all"}:${params.doctorId || ""}:${params.limit || 20}:${params.offset || 0}`
  return withCache(cacheKey, 30_000, async () => {
    const where: any = {}
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" as const } },
        { phone: { contains: params.search } },
      ]
    }
    if (params.status && params.status !== "all") {
      where.treatmentPlans = { some: { status: params.status } }
    }

    const patients = await prisma.patient.findMany({
      where,
      include: {
        treatmentPlans: {
          where: { status: "active" },
          include: { doctor: { select: { name: true } } },
          take: 1,
        },
        visits: { orderBy: { dateTime: "desc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
      take: params.limit || 20,
      skip: params.offset || 0,
    })
    const total = await prisma.patient.count({ where })

    return { patients, total }
  })
}

export async function getPatientById(id: string) {
  await requireAuth()
  return withCache(`patient:${id}`, 30_000, () =>
    prisma.patient.findUnique({
      where: { id },
      include: {
        treatmentPlans: {
          include: { doctor: { select: { name: true, id: true } } },
          orderBy: { createdAt: "desc" },
        },
        visits: {
          include: { plan: { select: { condition: true } } },
          orderBy: { dateTime: "desc" },
          take: 50,
        },
        reminders: { orderBy: { sendAt: "desc" }, take: 20 },
      },
    })
  )
}

export async function createPatient(data: {
  name: string
  phone: string
  email?: string | null
  address: string
  age?: number | null
  dateOfBirth?: string | null
  gender?: string | null
  reportedProblem: string
  referralSource?: string | null
  emergencyContact?: string | null
  notes?: string | null
}) {
  try {
    const session = await requireAuth()
    const patient = await prisma.patient.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        address: data.address,
        age: data.age ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ?? null,
        reportedProblem: data.reportedProblem,
        referralSource: data.referralSource ?? null,
        emergencyContact: data.emergencyContact ?? null,
        notes: data.notes ?? null,
      },
    })

    logAudit({
      actorId: session.id,
      entityType: "Patient",
      entityId: patient.id,
      action: "create",
      after: { name: data.name, phone: data.phone },
    })

    return patient
  } catch (e: any) {
    throw new Error(e.message || "Failed to create patient")
  }
}

export async function updatePatient(
  id: string,
  data: Record<string, any>
) {
  try {
    const session = await requireAuth()
    const before = await prisma.patient.findUnique({ where: { id } })
    if (!before) throw new Error("Patient not found")

    const sanitized = { ...data }
    if (sanitized.dateOfBirth) {
      sanitized.dateOfBirth = new Date(sanitized.dateOfBirth)
    } else if (sanitized.dateOfBirth === "" || sanitized.dateOfBirth === null) {
      sanitized.dateOfBirth = null
    }

    const patient = await prisma.patient.update({ where: { id }, data: sanitized })

    logAudit({
      actorId: session.id,
      entityType: "Patient",
      entityId: id,
      action: "update",
      before: {
        name: before.name,
        phone: before.phone,
        address: before.address,
        reportedProblem: before.reportedProblem,
      },
      after: {
        name: data.name ?? before.name,
        phone: data.phone ?? before.phone,
        address: data.address ?? before.address,
        reportedProblem: data.reportedProblem ?? before.reportedProblem,
      },
    })

    return { patient, before }
  } catch (e: any) {
    throw new Error(e.message || "Failed to update patient")
  }
}

export async function searchPatients(query: string) {
  await requireAuth()
  if (!query || query.length < 1) return []
  return withCache(`search:${query}`, 15_000, () =>
    prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query } },
        ],
      },
      include: {
        treatmentPlans: {
          where: { status: "active" },
          take: 1,
          include: { doctor: { select: { name: true } } },
        },
      },
      take: 10,
    })
  )
}

export async function getDuplicatePatients(phone: string, name: string) {
  await requireAuth()
  if (!phone && !name) return []
  return prisma.patient.findMany({
    where: {
      OR: [
        ...(phone ? [{ phone: { equals: phone } }] : []),
        ...(name ? [{ name: { equals: name, mode: "insensitive" as const } }] : []),
      ],
    },
    include: { visits: { orderBy: { dateTime: "desc" }, take: 1 } },
    take: 5,
  }) as unknown as { id: string; name: string; phone: string; visits: { dateTime: Date }[] }[]
}

export async function getTreatmentPlans(params: {
  patientId?: string
  doctorId?: string
  status?: string
}) {
  await requireAuth()
  const where: any = {}
  if (params.patientId) where.patientId = params.patientId
  if (params.doctorId) where.doctorId = params.doctorId
  if (params.status) where.status = params.status

  return prisma.treatmentPlan.findMany({
    where,
    include: {
      patient: { select: { name: true, phone: true } },
      doctor: { select: { name: true } },
      versions: { orderBy: { version: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}

export async function getTreatmentPlanById(id: string) {
  await requireAuth()
  const plan = await prisma.treatmentPlan.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { name: true } },
      versions: { orderBy: { version: "desc" } },
      visits: { orderBy: { dateTime: "desc" }, take: 20 },
      sessions: { orderBy: { sessionNumber: "asc" } },
    },
  })
  if (!plan) return null

  if (plan.visits.length === 0) {
    plan.visits = await prisma.visit.findMany({
      where: { patientId: plan.patientId },
      orderBy: { dateTime: "desc" },
      take: 20,
    }) as any
  }
  return plan
}

export type CreateTreatmentPlanResult = {
  success: boolean
  error?: string
  data?: any
}

export async function createTreatmentPlan(data: {
  patientId: string
  doctorId: string
  condition: string
  stagesTotal: number
  sittingsTotal: number
  intervalDays: number
  plannedVisitDates?: string | null
  expectedEndDate?: string | null
  status?: string
  startDate?: string | null
  sessionTime?: string
  specialNotes?: string | null
}): Promise<CreateTreatmentPlanResult> {
  try {
    const session = await requireRole("doctor")

    if (!data.patientId) {
      return { success: false, error: "Please select a patient" }
    }
    if (!data.doctorId) {
      return { success: false, error: "Please select a practitioner" }
    }

    const patient = await prisma.patient.findUnique({ where: { id: data.patientId }, select: { id: true } })
    const doctor = await prisma.user.findUnique({ where: { id: data.doctorId }, select: { id: true, role: true } })

    if (!patient) {
      return { success: false, error: "Selected patient not found" }
    }
    if (!doctor) {
      return { success: false, error: "Selected practitioner not found" }
    }
    if (doctor.role !== "doctor") {
      return { success: false, error: "Selected user is not a doctor" }
    }

    const startDate = data.startDate?.trim() ? toDateIST(data.startDate) : new Date()

    if (isPastDate(startDate)) {
      return { success: false, error: "Start date cannot be in the past" }
    }
    if (data.expectedEndDate?.trim() && isPastDate(toDateIST(data.expectedEndDate))) {
      return { success: false, error: "Expected end date cannot be in the past" }
    }
    if (data.stagesTotal < 1 || data.stagesTotal > 30) {
      return { success: false, error: "Stages must be between 1 and 30" }
    }
    if (data.sittingsTotal < 1 || data.sittingsTotal > 50) {
      return { success: false, error: "Sittings must be between 1 and 50" }
    }
    if (data.stagesTotal * data.sittingsTotal > 500) {
      return { success: false, error: "Total sessions cannot exceed 500" }
    }
    if (data.intervalDays < 1 || data.intervalDays > 90) {
      return { success: false, error: "Interval must be between 1 and 90 days" }
    }

    const plan = await prisma.$transaction(async (tx) => {
      const p = await tx.treatmentPlan.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          condition: data.condition,
          stagesTotal: data.stagesTotal,
          sittingsTotal: data.sittingsTotal,
          intervalDays: data.intervalDays,
          plannedVisitDates: data.plannedVisitDates?.trim() ? data.plannedVisitDates : null,
          expectedEndDate: data.expectedEndDate?.trim() ? new Date(data.expectedEndDate) : null,
          startDate,
          specialNotes: data.specialNotes ?? null,
          status: data.status ?? "active",
          version: 1,
        },
      })

      const [sessionH, sessionM] = (data.sessionTime || "10:00").split(":").map(Number)

      const totalSessions = data.stagesTotal * data.sittingsTotal
      const [sY, sM, sD] = data.startDate ? data.startDate.split("-").map(Number) : [0, 0, 0]
      const sessionData = Array.from({ length: totalSessions }, (_, i) => {
        const d = new Date(sY, sM - 1, sD + i * data.intervalDays)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        const stageNo = Math.floor(i / data.sittingsTotal) + 1
        const sittingNo = (i % data.sittingsTotal) + 1
        return {
          planId: p.id,
          sessionNumber: i + 1,
          stageNo,
          sittingNo,
          scheduledDate: new Date(`${dateStr}T${String(sessionH).padStart(2, "0")}:${String(sessionM).padStart(2, "0")}:00+05:30`),
          status: "scheduled",
        }
      })

      if (sessionData.length > 0) {
        await tx.planSession.createMany({ data: sessionData })
      }

      const slotData = sessionData.map((s) => {
        const start = new Date(s.scheduledDate)
        const end = new Date(start.getTime() + 60 * 60 * 1000)
        return {
          doctorId: data.doctorId,
          startTime: start,
          endTime: end,
          slotType: "available",
          status: "booked",
          patientId: data.patientId,
          overrideReason: `plan-session:${p.id}:${s.sessionNumber}`,
        }
      })
      if (slotData.length > 0) {
        await tx.scheduleSlot.createMany({ data: slotData })
      }

      await tx.planVersion.create({
        data: {
          planId: p.id,
          version: 1,
          stagesTotal: data.stagesTotal,
          sittingsTotal: data.sittingsTotal,
          intervalDays: data.intervalDays,
          condition: data.condition,
          specialNotes: data.specialNotes ?? null,
          plannedVisitDates: data.plannedVisitDates?.trim() ? data.plannedVisitDates : null,
          expectedEndDate: data.expectedEndDate?.trim() ? new Date(data.expectedEndDate) : null,
          status: data.status ?? "active",
          changeNotes: "Initial plan created",
        },
      })

      await tx.auditLog.create({
        data: {
          actorId: session.id,
          entityType: "TreatmentPlan",
          entityId: p.id,
          action: "create",
          after: JSON.stringify({ condition: data.condition, stages: data.stagesTotal, sittings: data.sittingsTotal }),
        },
      })

      return p
    })

    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const patientWithEmail = await prisma.patient.findUnique({ where: { id: data.patientId }, select: { email: true } })
    if (patientWithEmail?.email) {
      const nearSessions = await prisma.planSession.findMany({
        where: { planId: plan.id, scheduledDate: { gte: now, lte: in24h }, status: "scheduled" },
      })
      for (const s of nearSessions) {
        const existing = await prisma.reminder.findFirst({
          where: { patientId: data.patientId, template: "24h_appointment", visitId: null },
        })
        if (!existing) {
          const reminder = await prisma.reminder.create({
            data: { patientId: data.patientId, channel: "email", template: "24h_appointment", sendAt: now },
          })
          import("@/lib/notifications/dispatch").then(({ dispatchReminder }) => {
            dispatchReminder(reminder.id).catch(() => {})
          })
        }
      }
    }

    return { success: true, data: plan }
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to create treatment plan" }
  }
}

export async function updateTreatmentPlan(
  id: string,
  data: {
    stagesTotal?: number
    sittingsTotal?: number
    intervalDays?: number
    condition?: string
    specialNotes?: string | null
    plannedVisitDates?: string | null
    expectedEndDate?: string | null
    status?: string
    currentStage?: number
    currentSittingNumber?: number
    changeNotes?: string
  }
) {
  try {
    const session = await requireRole("doctor")
    const before = await prisma.treatmentPlan.findUnique({ where: { id } })
    if (!before) throw new Error("Plan not found")

    const plan = await prisma.$transaction(async (tx) => {
      const p = await tx.treatmentPlan.update({
        where: { id },
        data: {
          ...(data.stagesTotal !== undefined && { stagesTotal: data.stagesTotal }),
          ...(data.sittingsTotal !== undefined && { sittingsTotal: data.sittingsTotal }),
          ...(data.intervalDays !== undefined && { intervalDays: data.intervalDays }),
          ...(data.condition !== undefined && { condition: data.condition }),
          ...(data.specialNotes !== undefined && { specialNotes: data.specialNotes }),
          ...(data.plannedVisitDates !== undefined && { plannedVisitDates: data.plannedVisitDates?.trim() ? data.plannedVisitDates : null }),
          ...(data.expectedEndDate !== undefined && { expectedEndDate: data.expectedEndDate?.trim() ? new Date(data.expectedEndDate) : null }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.currentStage !== undefined && { currentStage: data.currentStage }),
          ...(data.currentSittingNumber !== undefined && { currentSittingNumber: data.currentSittingNumber }),
          version: { increment: 1 },
        },
      })

      await tx.planVersion.create({
        data: {
          planId: id,
          version: p.version,
          stagesTotal: data.stagesTotal ?? before.stagesTotal,
          sittingsTotal: data.sittingsTotal ?? before.sittingsTotal,
          intervalDays: data.intervalDays ?? before.intervalDays,
          condition: data.condition ?? before.condition,
          specialNotes: data.specialNotes ?? before.specialNotes,
          plannedVisitDates: data.plannedVisitDates?.trim() ? data.plannedVisitDates : before.plannedVisitDates,
          expectedEndDate: data.expectedEndDate?.trim() ? new Date(data.expectedEndDate) : before.expectedEndDate,
          status: data.status ?? before.status,
          changeNotes: data.changeNotes ?? "Plan updated",
        },
      })

      const stagesChanged = data.stagesTotal !== undefined && data.stagesTotal !== before.stagesTotal
      const sittingsChanged = data.sittingsTotal !== undefined && data.sittingsTotal !== before.sittingsTotal
      const intervalChanged = data.intervalDays !== undefined && data.intervalDays !== before.intervalDays

      if (stagesChanged || sittingsChanged || intervalChanged) {
        const newStages = data.stagesTotal ?? before.stagesTotal
        const newSittings = data.sittingsTotal ?? before.sittingsTotal
        const newInterval = data.intervalDays ?? before.intervalDays
        const totalSessions = newStages * newSittings

        await tx.planSession.deleteMany({
          where: { planId: id, status: "scheduled" },
        })

        const existingCompleted = await tx.planSession.findMany({
          where: { planId: id, status: { not: "scheduled" } },
          orderBy: { sessionNumber: "asc" },
        })

        const nextSessionNumber = existingCompleted.length + 1
        const lastCompletedDate = existingCompleted.length > 0
          ? existingCompleted[existingCompleted.length - 1].scheduledDate
          : (before.startDate ?? new Date(before.createdAt))

        const newSessionData = Array.from({ length: Math.max(0, totalSessions - existingCompleted.length) }, (_, i) => {
          const d = new Date(lastCompletedDate)
          d.setDate(d.getDate() + (nextSessionNumber + i) * newInterval)
          const globalIndex = existingCompleted.length + i
          const stageNo = Math.floor(globalIndex / newSittings) + 1
          const sittingNo = (globalIndex % newSittings) + 1
          return {
            planId: id,
            sessionNumber: nextSessionNumber + i,
            stageNo,
            sittingNo,
            scheduledDate: d,
            status: "scheduled",
          }
        })

        if (newSessionData.length > 0) {
          await tx.planSession.createMany({ data: newSessionData })
        }
      }

      return p
    })

    logAudit({
      actorId: session.id,
      entityType: "TreatmentPlan",
      entityId: id,
      action: "update",
      before: {
        stagesTotal: before.stagesTotal,
        sittingsTotal: before.sittingsTotal,
        intervalDays: before.intervalDays,
        condition: before.condition,
        status: before.status,
        currentStage: before.currentStage,
        currentSittingNumber: before.currentSittingNumber,
      },
      after: {
        stagesTotal: plan.stagesTotal,
        sittingsTotal: plan.sittingsTotal,
        intervalDays: plan.intervalDays,
        condition: plan.condition,
        status: plan.status,
        currentStage: plan.currentStage,
        currentSittingNumber: plan.currentSittingNumber,
      },
    })

    return plan
  } catch (e: any) {
    throw new Error(e.message || "Failed to update treatment plan")
  }
}

export async function getVisits(params: {
  patientId?: string
  planId?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
}) {
  await requireAuth()
  const where: any = {}
  if (params.patientId) where.patientId = params.patientId
  if (params.planId) where.planId = params.planId
  if (params.dateFrom || params.dateTo) {
    where.dateTime = {}
    if (params.dateFrom) where.dateTime.gte = params.dateFrom
    if (params.dateTo) where.dateTime.lte = params.dateTo
  }

  return prisma.visit.findMany({
    where,
    include: {
      patient: { select: { name: true } },
      plan: { select: { condition: true } },
    },
    orderBy: { dateTime: "desc" },
    take: params.limit || 50,
  })
}

export async function cancelVisit(id: string) {
  try {
    const session = await requireAuth()
    const before = await prisma.visit.findUnique({ where: { id } })
    if (!before) throw new Error("Visit not found")

    const visit = await prisma.visit.update({
      where: { id },
      data: { visitStatus: "cancelled" },
    })

    logAudit({
      actorId: session.id,
      entityType: "Visit",
      entityId: id,
      action: "update",
      before: { visitStatus: before.visitStatus },
      after: { visitStatus: "cancelled" },
    })

    return visit
  } catch (e: any) {
    throw new Error(e.message || "Failed to cancel visit")
  }
}

export async function getVisitById(id: string) {
  await requireAuth()
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      patient: true,
      plan: { include: { doctor: { select: { name: true } } } },
      scheduleSlot: {
        include: { doctor: { select: { name: true } } },
      },
    },
  })
  if (!visit) return null

  if (!visit.plan && visit.scheduleSlot?.overrideReason?.startsWith("plan-session:")) {
    const planId = visit.scheduleSlot.overrideReason.split(":")[1]
    const plan = await prisma.treatmentPlan.findUnique({
      where: { id: planId },
      include: { doctor: { select: { name: true } } },
    })
    if (plan) {
      (visit as any).plan = plan
      await prisma.visit.update({ where: { id }, data: { planId } })
    }
  }
  return visit
}

export async function createVisit(data: {
  patientId: string
  planId?: string | null
  dateTime: string
  stageNo: number
  sittingNo: number
  notes?: string | null
  nextVisitDate?: string | null
  visitStatus?: string
}) {
  try {
    const session = await requireAuth()
    const visitDate = toDateIST(data.dateTime)
    const receiptNumber = `ZF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const visit = await prisma.visit.create({
      data: {
        patientId: data.patientId,
        planId: data.planId ?? null,
        dateTime: visitDate,
        stageNo: data.stageNo,
        sittingNo: data.sittingNo,
        notes: data.notes ?? null,
        nextVisitDate: data.nextVisitDate ? toDateIST(data.nextVisitDate) : null,
        visitStatus: data.visitStatus ?? "completed",
        receiptNumber,
      },
    })

    logAudit({
      actorId: session.id,
      entityType: "Visit",
      entityId: visit.id,
      action: "create",
      after: {
        patientId: data.patientId,
        stageNo: data.stageNo,
        sittingNo: data.sittingNo,
        visitStatus: data.visitStatus,
      },
    })

    return visit
  } catch (e: any) {
    throw new Error(e.message || "Failed to create visit")
  }
}

export async function arrivePatient(slotId: string) {
  try {
    const session = await requireAuth()
    const slot = await prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: { patient: true, doctor: true, visit: true },
    })
    if (!slot) return { error: "Schedule slot not found" }
    if (slot.status !== "booked") return { error: "Slot is not booked" }
    if (slot.visit) return { error: "Patient already arrived for this slot" }

    let plan = null
    if (slot.overrideReason?.startsWith("plan-session:")) {
      const planId = slot.overrideReason.split(":")[1]
      plan = await prisma.treatmentPlan.findUnique({
        where: { id: planId },
        include: { sessions: { where: { status: "scheduled" }, orderBy: { sessionNumber: "asc" } } },
      })
    }
    if (!plan) {
      plan = await prisma.treatmentPlan.findFirst({
        where: { patientId: slot.patientId! },
        orderBy: { createdAt: "desc" },
        include: { sessions: { where: { status: "scheduled" }, orderBy: { sessionNumber: "asc" } } },
      })
    }

    const receiptNumber = `ZF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const visit = await prisma.visit.create({
      data: {
        patientId: slot.patientId!,
        planId: plan?.id ?? null,
        scheduleSlotId: slot.id,
        dateTime: slot.startTime,
        stageNo: plan?.currentStage ?? 1,
        sittingNo: (plan?.currentSittingNumber ?? 0) + 1,
        visitStatus: "arrived",
        receiptNumber,
      },
    })

    await prisma.scheduleSlot.update({
      where: { id: slot.id },
      data: { status: "arrived" },
    })

    logAudit({
      actorId: session.id,
      entityType: "Visit",
      entityId: visit.id,
      action: "create",
      after: { patientId: slot.patientId, status: "arrived", slotId: slot.id },
    })

    return visit
  } catch (e: any) {
    return { error: e.message || "Failed to mark patient as arrived" }
  }
}

export async function completeVisit(visitId: string, notes?: string | null) {
  try {
    const session = await requireRole("doctor")
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { patient: { select: { email: true } }, scheduleSlot: true, plan: { include: { sessions: true } } },
    })
    if (!visit) return { error: "Visit not found" }
    if (visit.visitStatus === "completed") return { error: "Visit is already completed" }

    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: {
        visitStatus: "completed",
        notes: notes ?? undefined,
      },
    })

    if (visit.scheduleSlot) {
      await prisma.scheduleSlot.update({
        where: { id: visit.scheduleSlot.id },
        data: { status: "completed" },
      })
    }

    let planId = visit.plan?.id
    if (!planId && visit.scheduleSlot?.overrideReason?.startsWith("plan-session:")) {
      planId = visit.scheduleSlot.overrideReason.split(":")[1]
      await prisma.visit.update({
        where: { id: visitId },
        data: { planId },
      })
    }
    if (planId) {
      const sessionToUpdate = await prisma.planSession.findFirst({
        where: { planId, stageNo: visit.stageNo, sittingNo: visit.sittingNo, status: "scheduled" },
      })
      if (sessionToUpdate) {
        await prisma.planSession.update({
          where: { id: sessionToUpdate.id },
          data: { status: "completed" },
        })
      }

      const completedCount = await prisma.planSession.count({
        where: { planId, status: "completed" },
      })
      const plan = await prisma.treatmentPlan.findUnique({
        where: { id: planId },
        select: { currentStage: true, sittingsTotal: true, stagesTotal: true },
      })
      if (plan) {
        const nextStage = completedCount > plan.sittingsTotal && plan.currentStage < plan.stagesTotal
          ? plan.currentStage + 1 : plan.currentStage
        await prisma.treatmentPlan.update({
          where: { id: planId },
          data: { currentSittingNumber: completedCount, currentStage: nextStage },
        })
      }

      const nextSession = await prisma.planSession.findFirst({
        where: { planId, status: "scheduled" },
        orderBy: { sessionNumber: "asc" },
        include: { plan: { select: { patientId: true } } },
      })
      if (nextSession && visit.patient?.email) {
        const now = new Date()
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        if (nextSession.scheduledDate <= in24h && nextSession.scheduledDate > now) {
          const existing = await prisma.reminder.findFirst({
            where: { patientId: nextSession.plan.patientId, template: "24h_appointment", visitId: null },
          })
          if (!existing) {
            const reminder = await prisma.reminder.create({
              data: {
                patientId: nextSession.plan.patientId,
                channel: "email",
                template: "24h_appointment",
                sendAt: now,
              },
            })
            import("@/lib/notifications/dispatch").then(({ dispatchReminder }) => {
              dispatchReminder(reminder.id).catch(() => {})
            })
          }
        }
      }
    }

    logAudit({
      actorId: session.id,
      entityType: "Visit",
      entityId: visit.id,
      action: "update",
      after: { status: "completed", planProgress: visit.plan ? { currentSittingNumber: visit.plan.currentSittingNumber + 1 } : null },
    })

    return updated
  } catch (e: any) {
    return { error: e.message || "Failed to complete visit" }
  }
}

export async function getScheduleSlots(params: {
  doctorId?: string
  dateFrom?: Date
  dateTo?: Date
}) {
  await requireAuth()
  const where: any = {}
  if (params.doctorId) where.doctorId = params.doctorId
  if (params.dateFrom || params.dateTo) {
    where.startTime = {}
    if (params.dateFrom) where.startTime.gte = params.dateFrom
    if (params.dateTo) where.startTime.lte = params.dateTo
  }

  return prisma.scheduleSlot.findMany({
    where,
    include: {
      doctor: { select: { name: true } },
      patient: { select: { name: true, phone: true } },
      visit: { select: { id: true, visitStatus: true } },
    },
    orderBy: { startTime: "asc" },
    take: 200,
  })
}

export async function createScheduleSlot(data: {
  doctorId: string
  startTime: string
  endTime: string
  slotType?: string
  status?: string
  overrideReason?: string | null
  patientId?: string | null
}) {
  const session = await requireAuth()
  const start = toDateIST(data.startTime)
  const end = toDateIST(data.endTime)

  const slot = await prisma.$transaction(async (tx) => {
    if (data.status === "booked" && !data.overrideReason) {
      const conflicts = await tx.scheduleSlot.findMany({
        where: {
          doctorId: data.doctorId,
          status: { in: ["booked", "arrived"] },
          AND: [
            { startTime: { lt: end } },
            { endTime: { gt: start } },
          ],
        },
        take: 1,
      })
      if (conflicts.length > 0) {
        throw new Error(
          "Slot conflict detected. Provide an override reason to book this slot."
        )
      }
    }

    return tx.scheduleSlot.create({
      data: {
        doctorId: data.doctorId,
        startTime: start,
        endTime: end,
        slotType: data.slotType ?? "available",
        status: data.status ?? "free",
        overrideReason: data.overrideReason ?? null,
        patientId: data.patientId ?? null,
      },
    })
  })

  logAudit({
    actorId: session.id,
    entityType: "ScheduleSlot",
    entityId: slot.id,
    action: "create",
    after: {
      doctorId: data.doctorId,
      slotType: data.slotType,
      status: data.status,
      overrideReason: data.overrideReason,
    },
  })

  return slot
}

export async function checkSlotConflict(doctorId: string, startTime: Date, endTime: Date) {
  await requireAuth()
  return prisma.scheduleSlot.findFirst({
    where: {
      doctorId,
      status: { not: "blocked" },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  })
}

export async function bookAppointmentSlot(data: {
  doctorId: string
  startTime: string
  endTime: string
  patientId: string
  reason?: string
  overrideConflict?: boolean
}) {
  try {
    const session = await requireAuth()
    const start = toDateIST(data.startTime)
    const end = toDateIST(data.endTime)

    if (!data.overrideConflict) {
      const conflicts = await prisma.scheduleSlot.findMany({
        where: {
          doctorId: data.doctorId,
          status: { in: ["booked", "arrived"] },
          AND: [
            { startTime: { lt: end } },
            { endTime: { gt: start } },
          ],
        },
        take: 1,
      })
      if (conflicts.length > 0) {
        return { error: "Slot conflict detected. Enable override to book anyway." }
      }

      const patientConflict = await prisma.scheduleSlot.findFirst({
        where: {
          patientId: data.patientId,
          status: "booked",
          AND: [
            { startTime: { lt: end } },
            { endTime: { gt: start } },
          ],
        },
      })
      if (patientConflict) {
        return { error: "Patient already has an appointment during this time" }
      }
    }

    const slot = await prisma.scheduleSlot.create({
      data: {
        doctorId: data.doctorId,
        startTime: start,
        endTime: end,
        slotType: "available",
        status: "booked",
        patientId: data.patientId,
        overrideReason: data.overrideConflict ? data.reason || "override" : null,
      },
    })

    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } })
    if (patient?.email) {
      const now = new Date()
      const doctor = await prisma.user.findUnique({ where: { id: data.doctorId } })
      const clinicName = "ZenFlow Clinic"

      const apptDate = start.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata",
      })
      const apptTime = `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} - ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}`

      const { subject, html } = buildReminderEmail(patient.name, "booking_confirmation", apptDate, {
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        practitionerName: doctor?.name || "",
        location: clinicName,
      })
      await sendEmail({ to: patient.email, subject, html })

      const twentyFourHoursBefore = new Date(start.getTime() - 24 * 60 * 60 * 1000)
      if (twentyFourHoursBefore > now) {
        await prisma.reminder.create({
          data: {
            patientId: data.patientId,
            visitId: slot.id,
            channel: "email",
            template: "24h_appointment",
            sendAt: twentyFourHoursBefore,
            status: "pending",
          },
        })
      }

      const twoHoursBefore = new Date(start.getTime() - 2 * 60 * 60 * 1000)
      if (twoHoursBefore > now) {
        await prisma.reminder.create({
          data: {
            patientId: data.patientId,
            visitId: slot.id,
            channel: "email",
            template: "2h_appointment",
            sendAt: twoHoursBefore,
            status: "pending",
          },
        })
      }
    }

    logAudit({
      actorId: session.id,
      entityType: "ScheduleSlot",
      entityId: slot.id,
      action: "create",
      after: { doctorId: data.doctorId, patientId: data.patientId, status: "booked" },
    })

    return slot
  } catch (e: any) {
    return { error: e.message || "Failed to book appointment" }
  }
}

export async function updateScheduleSlot(
  id: string,
  data: { status?: string; patientId?: string | null; overrideReason?: string | null }
) {
  try {
    const session = await requireAuth()
    const before = await prisma.scheduleSlot.findUnique({ where: { id } })
    if (!before) throw new Error("Slot not found")

    const slot = await prisma.scheduleSlot.update({ where: { id }, data })

    logAudit({
      actorId: session.id,
      entityType: "ScheduleSlot",
      entityId: id,
      action: "update",
      before: { status: before.status, patientId: before.patientId },
      after: { status: slot.status, patientId: slot.patientId },
    })

    return slot
  } catch (e: any) {
    throw new Error(e.message || "Failed to update schedule slot")
  }
}

export async function getReminders(params: {
  patientId?: string
  status?: string
  channel?: string
  limit?: number
}) {
  await requireAuth()
  const where: any = {}
  if (params.patientId) where.patientId = params.patientId
  if (params.status) where.status = params.status
  if (params.channel) where.channel = params.channel

  return prisma.reminder.findMany({
    where,
    include: { patient: { select: { name: true, phone: true } } },
    orderBy: { sendAt: "desc" },
    take: params.limit || 50,
  })
}

export async function createReminder(data: {
  patientId: string
  visitId?: string | null
  channel: string
  template: string
  sendAt: string
}) {
  try {
    const session = await requireAuth()
    const sendAt = toDateIST(data.sendAt)
    if (isPastDate(sendAt)) throw new Error("Reminder send time cannot be in the past")
    const reminder = await prisma.reminder.create({
      data: {
        patientId: data.patientId,
        visitId: data.visitId ?? null,
        channel: data.channel,
        template: data.template,
        sendAt,
      },
    })

    logAudit({
      actorId: session.id,
      entityType: "Reminder",
      entityId: reminder.id,
      action: "create",
      after: { channel: data.channel, template: data.template },
    })

    return reminder
  } catch (e: any) {
    throw new Error(e.message || "Failed to create reminder")
  }
}

export async function retryReminder(id: string) {
  try {
    const session = await requireAuth()
    const reminder = await prisma.reminder.findUnique({ where: { id } })
    if (!reminder) throw new Error("Reminder not found")
    if (reminder.deliveryAttempts >= 5) throw new Error("Max retry attempts reached (5)")

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        status: "pending",
        deliveryAttempts: reminder.deliveryAttempts + 1,
        lastError: null,
      },
    })

    logAudit({
      actorId: session.id,
      entityType: "Reminder",
      entityId: id,
      action: "update",
      before: { status: reminder.status, deliveryAttempts: reminder.deliveryAttempts },
      after: { status: "pending", deliveryAttempts: updated.deliveryAttempts },
    })

    return updated
  } catch (e: any) {
    throw new Error(e.message || "Failed to retry reminder")
  }
}

export async function pauseReminder(id: string) {
  try {
    const session = await requireAuth()
    const reminder = await prisma.reminder.findUnique({ where: { id } })
    if (!reminder) throw new Error("Reminder not found")

    const newStatus = reminder.status === "paused" ? "pending" : "paused"

    const updated = await prisma.reminder.update({
      where: { id },
      data: { status: newStatus },
    })

    logAudit({
      actorId: session.id,
      entityType: "Reminder",
      entityId: id,
      action: "update",
      before: { status: reminder.status },
      after: { status: newStatus },
    })

    return updated
  } catch (e: any) {
    throw new Error(e.message || "Failed to update reminder")
  }
}

export async function getOverduePatients() {
  await requireAuth()
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string; name: string; phone: string
    lastVisitDate: Date | null
    planId: string; intervalDays: number
    doctorName: string | null
  }>>(`
    SELECT p.id, p.name, p.phone,
      (SELECT MAX(v."dateTime") FROM "Visit" v WHERE v."patientId" = p.id) as "lastVisitDate",
      tp.id as "planId", tp."intervalDays",
      u.name as "doctorName"
    FROM "Patient" p
    JOIN "TreatmentPlan" tp ON tp."patientId" = p.id AND tp.status = 'active'
    LEFT JOIN "User" u ON u.id = tp."doctorId"
    WHERE EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(v2."dateTime") FROM "Visit" v2 WHERE v2."patientId" = p.id))) / 86400 > tp."intervalDays"
    ORDER BY p.name ASC
    LIMIT 100
  `)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    treatmentPlans: [{
      id: r.planId,
      status: "active",
      intervalDays: r.intervalDays,
      doctor: { name: r.doctorName || "Unknown" },
    }],
    visits: r.lastVisitDate ? [{ dateTime: r.lastVisitDate }] : [],
  }))
}

export async function getClinicSettings() {
  await requireAuth()
  return withCache("clinic-settings", 60_000, async () => {
    const settings = await prisma.clinicSetting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) {
      map[s.key] = s.value
    }
    return map
  })
}
export async function setClinicSetting(key: string, value: string) {
  try {
    const session = await requireRole("admin")
    const before = await prisma.clinicSetting.findUnique({ where: { key } })

    const setting = await prisma.clinicSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    logAudit({
      actorId: session.id,
      entityType: "ClinicSetting",
      entityId: key,
      action: "update",
      before: before ? { value: before.value } : undefined,
      after: { value },
    })

    clearCache("clinic-settings")
    return setting
  } catch (e: any) {
    throw new Error(e.message || "Failed to update clinic setting")
  }
}

export async function getTodaySchedule() {
  await requireAuth()
  return withCache("today-schedule", 30_000, async () => {
    const start = istMidnightUTC()
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

    const visits = await prisma.visit.findMany({
      where: { dateTime: { gte: start, lt: end } },
      include: {
        patient: { select: { name: true } },
        plan: { select: { condition: true } },
        scheduleSlot: { select: { id: true, status: true } },
      },
      orderBy: { dateTime: "asc" },
    })
    const slots = await prisma.scheduleSlot.findMany({
      where: { startTime: { gte: start, lt: end } },
      include: {
        doctor: { select: { name: true } },
        patient: { select: { name: true, phone: true } },
        visit: { select: { id: true, visitStatus: true } },
      },
      orderBy: { startTime: "asc" },
    })

    return { visits, slots }
  })
}

export async function getPlanSessions(planId: string) {
  await requireAuth()
  return prisma.planSession.findMany({
    where: { planId },
    orderBy: { sessionNumber: "asc" },
    take: 500,
  })
}

export async function updatePlanSession(
  id: string,
  data: {
    scheduledDate?: string
    status?: string
    notes?: string | null
    sessionTime?: string
  }
) {
  try {
    await requireRole("doctor")
    const before = await prisma.planSession.findUnique({
      where: { id },
      include: { plan: { select: { id: true, doctorId: true, patientId: true } } },
    })
    if (!before) throw new Error("Session not found")

    const [h, m] = (data.sessionTime || "10:00").split(":").map(Number)
    let combinedDate: Date
    if (data.scheduledDate) {
      combinedDate = new Date(`${data.scheduledDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`)
    } else if (data.sessionTime !== undefined) {
      const dateStr = before.scheduledDate.toISOString().split("T")[0]
      combinedDate = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`)
    } else {
      combinedDate = new Date(before.scheduledDate)
    }

    const updateData: any = {}
    if (data.scheduledDate !== undefined || data.sessionTime !== undefined) {
      updateData.scheduledDate = combinedDate
    }
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes

    const sess = await prisma.planSession.update({
      where: { id },
      data: updateData,
    })

    const slotKey = `plan-session:${before.plan.id}:${before.sessionNumber}`

    if (data.scheduledDate !== undefined || data.sessionTime !== undefined) {
      const newEnd = new Date(combinedDate.getTime() + 60 * 60 * 1000)

      await prisma.scheduleSlot.updateMany({
        where: { overrideReason: slotKey },
        data: { startTime: combinedDate, endTime: newEnd },
      })
    }

    if (data.status !== undefined) {
      const slotStatus = data.status === "completed" ? "completed" as const
        : data.status === "cancelled" ? "free" as const
        : "booked" as const
      await prisma.scheduleSlot.updateMany({
        where: { overrideReason: slotKey },
        data: { status: slotStatus },
      })

      if (data.status === "completed" && before.status !== "completed") {
        const completedCount = await prisma.planSession.count({
          where: { planId: before.plan.id, status: "completed" },
        })
        const plan = await prisma.treatmentPlan.findUnique({
          where: { id: before.plan.id },
          select: { currentStage: true, sittingsTotal: true, stagesTotal: true },
        })
        if (plan) {
          const nextStage = completedCount > plan.sittingsTotal && plan.currentStage < plan.stagesTotal
            ? plan.currentStage + 1 : plan.currentStage
          await prisma.treatmentPlan.update({
            where: { id: before.plan.id },
            data: {
              currentSittingNumber: completedCount,
              currentStage: nextStage,
            },
          })
        }
      }
    }

    logAudit({
      entityType: "PlanSession",
      entityId: id,
      action: "update",
      before: { scheduledDate: before.scheduledDate.toISOString(), status: before.status },
      after: {
        scheduledDate: sess.scheduledDate.toISOString(),
        status: sess.status,
      },
    })

    return sess
  } catch (e: any) {
    throw new Error(e.message || "Failed to update session")
  }
}

export async function getDashboardStats() {
  await requireAuth()
  return withCache("dashboard-stats", 30_000, async () => {
    const start = istMidnightUTC()
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, bigint>>>(
      `SELECT
        (SELECT COUNT(*) FROM "Visit" WHERE "dateTime" >= $1::timestamp AND "dateTime" < $2::timestamp) AS "todayVisits",
        (SELECT COUNT(*) FROM "TreatmentPlan" WHERE status = 'active') AS "activePlans",
        (SELECT COUNT(*) FROM "Patient" WHERE "createdAt" >= $1::timestamp) AS "newPatients",
        (SELECT COUNT(*) FROM "Patient") AS "totalPatients",
        (SELECT COUNT(*) FROM "Patient" p WHERE EXISTS (SELECT 1 FROM "TreatmentPlan" tp2 WHERE tp2."patientId" = p.id AND tp2.status = 'active') AND EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(v3."dateTime") FROM "Visit" v3 WHERE v3."patientId" = p.id))) / 86400 > (SELECT tp3."intervalDays" FROM "TreatmentPlan" tp3 WHERE tp3."patientId" = p.id AND tp3.status = 'active' LIMIT 1)) AS "overdueCount"`,
      start,
      end
    )
    const row = rows[0] || {}
    return {
      todayVisits: Number(row.todayVisits ?? 0),
      activePlans: Number(row.activePlans ?? 0),
      newPatients: Number(row.newPatients ?? 0),
      totalPatients: Number(row.totalPatients ?? 0),
      overdueCount: Number(row.overdueCount ?? 0),
    }
  })
}

export async function getAuditLogsAction(params: {
  entityType?: string
  action?: string
  limit?: number
  offset?: number
}) {
  await requireAuth()
  const where: Record<string, string> = {}
  if (params.entityType) where.entityType = params.entityType
  if (params.action) where.action = params.action

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: params.limit || 10,
    skip: params.offset || 0,
  })
  const total = await prisma.auditLog.count({ where })
  return { logs, total }
}

export async function exportAuditLogs(filters: {
  entityType?: string
  action?: string
}) {
  const session = await requireAuth()
  const where: Record<string, string> = {}
  if (filters.entityType) where.entityType = filters.entityType
  if (filters.action) where.action = filters.action

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })

  const header = "Timestamp,Actor,Roles,Entity Type,Entity ID,Action\n"
  const rows = logs.map((l) =>
    [
      `"${l.createdAt.toISOString()}"`,
      `"${l.actor?.name || "System"}"`,
      `"${l.actor?.role || "—"}"`,
      `"${l.entityType}"`,
      `"${l.entityId || ""}"`,
      `"${l.action}"`,
    ].join(",")
  )
  return header + rows.join("\n")
}

export async function sendReminderNow(patientId: string, template: string = "thank_you") {
  try {
    const session = await requireAuth()
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) throw new Error("Patient not found")
    if (!patient.email) throw new Error("Patient has no email address")

    const sendAt = new Date().toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
    const { subject, html } = buildReminderEmail(patient.name, template, sendAt)
    await sendEmail({ to: patient.email, subject, html })

    await prisma.reminder.create({
      data: {
        patientId,
        channel: "email",
        template,
        sendAt: new Date(),
        status: "sent",
        deliveryAttempts: 1,
      },
    })

    logAudit({
      actorId: session.id,
      entityType: "Reminder",
      entityId: patientId,
      action: "create",
      after: { channel: "email", template, sentTo: patient.email },
    })

    return { success: true }
  } catch (e: any) {
    throw new Error(e.message || "Failed to send reminder")
  }
}

export async function processPendingRemindersAction() {
  try {
    const session = await requireRole("admin")
    const { processPendingReminders } = await import("@/lib/notifications/dispatch")
    const result = await processPendingReminders()
    logAudit({
      actorId: session.id,
      entityType: "Reminder",
      entityId: "batch",
      action: "create",
      after: result,
    })
    return result
  } catch (e: any) {
    throw new Error(e.message || "Failed to process pending reminders")
  }
}

export async function deletePatient(patientId: string) {
  const session = await requireRole("admin")
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { name: true },
  })
  if (!patient) throw new Error("Patient not found")

  await prisma.scheduleSlot.deleteMany({ where: { patientId } })
  await prisma.patient.delete({ where: { id: patientId } })

  logAudit({
    actorId: session.id,
    entityType: "Patient",
    entityId: patientId,
    action: "delete",
    before: { name: patient.name },
  })
  clearCache(`patients`)
  return { success: true }
}

export async function sendTestEmail(to: string) {
  try {
    const session = await requireRole("admin")
    if (!to || !to.includes("@")) throw new Error("Valid email required")
    const { subject, html } = buildReminderEmail(session.name, "thank_you", "")
    await sendEmail({ to, subject, html })
    logAudit({
      actorId: session.id,
      entityType: "ClinicSetting",
      entityId: "test-email",
      action: "create",
      after: { sentTo: to },
    })
    return { success: true }
  } catch (e: any) {
    throw new Error(e.message || "Failed to send test email")
  }
}
