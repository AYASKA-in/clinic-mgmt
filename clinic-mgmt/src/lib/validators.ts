import { z } from "zod"

export const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Invalid email").optional().nullable(),
  address: z.string().min(5, "Address is required"),
  age: z.coerce.number().int().min(0).max(150).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  reportedProblem: z.string().min(3, "Health problem is required"),
  referralSource: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  consentFlags: z.string().optional().nullable(),
})

export type PatientFormData = z.infer<typeof patientSchema>

export const treatmentPlanSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  doctorId: z.string().min(1, "Please select a practitioner"),
  condition: z.string().min(3, "Condition is required"),
  stagesTotal: z.coerce.number().int().min(1, "At least 1 stage required").max(20),
  sittingsTotal: z.coerce.number().int().min(1, "At least 1 sitting required").max(100),
  intervalDays: z.coerce.number().int().min(1, "At least 1 day interval").max(90),
  plannedVisitDates: z.string().optional().nullable(),
  expectedEndDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  sessionTime: z.string().default("10:00"),
  status: z.string().default("active"),
  specialNotes: z.string().optional().nullable(),
})

export type TreatmentPlanFormData = z.infer<typeof treatmentPlanSchema>

export const visitSchema = z.object({
  patientId: z.string(),
  planId: z.string().optional().nullable(),
  dateTime: z.string(),
  stageNo: z.coerce.number().int().min(1),
  sittingNo: z.coerce.number().int().min(1),
  notes: z.string().optional().nullable(),
  nextVisitDate: z.string().optional().nullable(),
  visitStatus: z.string().default("completed"),
})

export type VisitFormData = z.infer<typeof visitSchema>

export const reminderSchema = z.object({
  patientId: z.string(),
  visitId: z.string().optional().nullable(),
  channel: z.enum(["email"]),
  template: z.string(),
  sendAt: z.string(),
})

export type ReminderFormData = z.infer<typeof reminderSchema>

export const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "doctor", "receptionist"]),
  active: z.boolean().default(true),
})

export type UserFormData = z.infer<typeof userSchema>

export const scheduleSlotSchema = z.object({
  doctorId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  slotType: z.string().default("available"),
  status: z.string().default("free"),
  overrideReason: z.string().optional().nullable(),
  patientId: z.string().optional().nullable(),
})

export type ScheduleSlotFormData = z.infer<typeof scheduleSlotSchema>

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type LoginFormData = z.infer<typeof loginSchema>
