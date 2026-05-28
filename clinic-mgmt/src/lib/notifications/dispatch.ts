import prisma from "@/lib/db"
import { sendEmail, buildReminderEmail } from "./email"

async function getAppointmentContext(reminder: {
  visitId: string | null
  template: string
}): Promise<{
  appointmentDate: string
  appointmentTime: string
  practitionerName: string
  location: string
}> {
  const isAppointmentReminder =
    reminder.template === "booking_confirmation" ||
    reminder.template === "24h_appointment" ||
    reminder.template === "2h_appointment"

  if (!isAppointmentReminder || !reminder.visitId) {
    return { appointmentDate: "", appointmentTime: "", practitionerName: "", location: "" }
  }

  const slot = await prisma.scheduleSlot.findUnique({
    where: { id: reminder.visitId },
    include: { doctor: { select: { name: true } } },
  })

  if (!slot) return { appointmentDate: "", appointmentTime: "", practitionerName: "", location: "" }

  return {
    appointmentDate: slot.startTime.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }),
    appointmentTime: `${slot.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${slot.endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
    practitionerName: slot.doctor?.name || "",
    location: "ZenFlow Clinic",
  }
}

export async function dispatchReminder(reminderId: string) {
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { patient: true },
  })

  if (!reminder) throw new Error("Reminder not found")
  if (reminder.status !== "pending") return

  const patientName = reminder.patient.name
  const context = await getAppointmentContext(reminder)

  try {
    if (!reminder.patient.email) {
      await prisma.reminder.update({
        where: { id: reminderId },
        data: { status: "failed", lastError: "Patient has no email address", deliveryAttempts: { increment: 1 } },
      })
      return
    }
    const displayDate =
      reminder.template === "24h_appointment"
        ? "tomorrow"
        : reminder.template === "2h_appointment"
          ? "in 2 hours"
          : context.appointmentDate

    const { subject, html } = buildReminderEmail(patientName, reminder.template, displayDate, context)
    await sendEmail({ to: reminder.patient.email, subject, html })

    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: "sent",
        deliveryAttempts: { increment: 1 },
      },
    })
  } catch (err: any) {
    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: "failed",
        deliveryAttempts: { increment: 1 },
        lastError: err.message,
      },
    })
  }
}

async function ensureRemindersExist() {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const upcomingSlots = await prisma.scheduleSlot.findMany({
    where: {
      status: "booked",
      patientId: { not: null },
      startTime: { gte: now, lte: in24h },
    },
    include: { patient: { select: { email: true } } },
  })

  for (const slot of upcomingSlots) {
    if (!slot.patientId || !slot.patient?.email) continue

    const existing = await prisma.reminder.findFirst({
      where: { patientId: slot.patientId, visitId: slot.id, template: "24h_appointment" },
    })
    if (existing) continue

    const sendAt = new Date(slot.startTime.getTime() - 24 * 60 * 60 * 1000)
    if (sendAt > now) continue

    await prisma.reminder.create({
      data: {
        patientId: slot.patientId,
        visitId: slot.id,
        channel: "email",
        template: "24h_appointment",
        sendAt: now,
      },
    })
  }
}

export async function processPendingReminders() {
  await ensureRemindersExist()

  const pending = await prisma.reminder.findMany({
    where: {
      status: "pending",
      sendAt: { lte: new Date() },
      deliveryAttempts: { lt: 5 },
    },
    take: 50,
  })

  const results = { created: 0, processed: 0, failed: 0 }
  await Promise.allSettled(
    pending.map(async (r) => {
      try {
        await dispatchReminder(r.id)
        results.processed++
      } catch {
        results.failed++
      }
    })
  )

  return results
}
