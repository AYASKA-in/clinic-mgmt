export const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  RECEPTIONIST: "receptionist",
} as const

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  doctor: 2,
  receptionist: 1,
}

export function hasMinRole(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function canAccessRole(currentUserRole: string, targetRole: string): boolean {
  if (currentUserRole === "admin") return true
  return currentUserRole === targetRole
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  doctor: "Doctor",
  receptionist: "Receptionist",
}

export const SLOT_STATUS_LABELS: Record<string, string> = {
  free: "Available",
  booked: "Booked",
  blocked: "Blocked",
  completed: "Completed",
}

export const SLOT_TYPE_LABELS: Record<string, string> = {
  available: "Available",
  appointment: "Appointment",
  lunch: "Lunch Break",
  break: "Break",
  external: "External Work",
  leave: "Leave",
  emergency: "Emergency",
}

export const VISIT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  arrived: "Arrived",
  in_treatment: "In Treatment",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
}

export const PLAN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const REMINDER_CHANNELS = ["email"] as const

export const REMINDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  failed: "Failed",
  paused: "Paused",
}

export const REMINDER_TEMPLATES = [
  { id: "24h_appointment", label: "24h Appointment Confirmation" },
  { id: "2h_appointment", label: "2h Appointment Reminder" },
  { id: "post_session", label: "Post-Session Check-in" },
  { id: "follow_up", label: "Follow-up Reminder" },
  { id: "thank_you", label: "Thank You Message" },
  { id: "intake_form", label: "Intake Form Request" },
] as const
