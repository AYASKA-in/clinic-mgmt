const RESEND_API = "https://api.resend.com"

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

const BRAND_COLOR = "#059669"
const BG_COLOR = "#f8fafc"
const CARD_BG = "#ffffff"
const TEXT_COLOR = "#1e293b"
const MUTED_COLOR = "#64748b"

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_COLOR}">
<tr><td style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="480" align="center" style="max-width:480px;margin:0 auto;background:${CARD_BG};border-radius:12px;overflow:hidden">
<tr><td style="padding:0">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND_COLOR};padding:24px 32px">
<tr><td style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">ZenFlow Clinic</td></tr>
<tr><td style="color:#ffffffaa;font-size:13px;margin-top:4px">Acupuncture & Wellness</td></tr>
</table>
</td></tr>
<tr><td style="padding:32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6">${content}</td></tr>
<tr><td style="padding:0 32px 32px;border-top:1px solid #e2e8f0;padding-top:24px;color:${MUTED_COLOR};font-size:12px;line-height:1.5">
<p style="margin:0">This is an automated message from ZenFlow Clinic. Please do not reply to this email.</p>
<p style="margin:8px 0 0">If you have questions, contact us at your clinic's office.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY not set")
  const from = process.env.FROM_EMAIL || "onboarding@resend.dev"

  const res = await fetch(`${RESEND_API}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }

  return res.json()
}

function formatDateForEmail(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
}

function formatTimeForEmail(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export type ReminderContext = {
  appointmentDate?: string
  appointmentTime?: string
  practitionerName?: string
  location?: string
}

export function buildReminderEmail(
  patientName: string,
  template: string,
  scheduledDate: string,
  context?: ReminderContext
): { subject: string; html: string } {
  const name = escapeHtml(patientName)
  const date = escapeHtml(scheduledDate)
  const apptDate = context?.appointmentDate ? escapeHtml(context.appointmentDate) : ""
  const apptTime = context?.appointmentTime ? escapeHtml(context.appointmentTime) : ""
  const practitioner = context?.practitionerName ? escapeHtml(context.practitionerName) : ""
  const location = context?.location ? escapeHtml(context.location) : ""

  function detailRow(label: string, value: string): string {
    return value
      ? `<tr><td style="padding:6px 12px;color:${MUTED_COLOR};font-size:12px;width:80px;vertical-align:top">${label}</td><td style="padding:6px 12px;font-size:14px">${value}</td></tr>`
      : ""
  }

  const templates: Record<string, { subject: string; content: string }> = {
    booking_confirmation: {
      subject: "Appointment Confirmed",
      content: `<p style="margin:0 0 16px">Dear ${name},</p>
<p style="margin:0 0 16px">Your appointment has been confirmed. Here are the details:</p>
<table cellpadding="0" cellspacing="0" border="0" style="background:${BG_COLOR};border-radius:8px;margin:0 0 16px;width:100%">
${detailRow("Date", apptDate)}
${detailRow("Time", apptTime)}
${detailRow("Practitioner", practitioner)}
${detailRow("Location", location)}
</table>
<p style="margin:0 0 8px">Please arrive 10 minutes before your scheduled time.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">To reschedule or cancel, please contact the clinic.</p>`,
    },
    "24h_appointment": {
      subject: "Reminder: Your Appointment is Tomorrow",
      content: `<p style="margin:0 0 16px">Dear ${name},</p>
<p style="margin:0 0 16px">This is a friendly reminder that you have an appointment scheduled for <strong>${date}</strong>.</p>
<table cellpadding="0" cellspacing="0" border="0" style="background:${BG_COLOR};border-radius:8px;margin:0 0 16px;width:100%">
${detailRow("Date", apptDate)}
${detailRow("Time", apptTime)}
${detailRow("Practitioner", practitioner)}
${detailRow("Location", location)}
</table>
<p style="margin:0 0 8px">Please arrive 10 minutes before your scheduled time.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">To reschedule or cancel, please contact the clinic.</p>`,
    },
    "2h_appointment": {
      subject: "Appointment in 2 Hours",
      content: `<p style="margin:0 0 16px">Dear ${name},</p>
<p style="margin:0 0 16px">Your appointment is in <strong>2 hours</strong>. Here are the details:</p>
<table cellpadding="0" cellspacing="0" border="0" style="background:${BG_COLOR};border-radius:8px;margin:0 0 16px;width:100%">
${detailRow("Date", apptDate)}
${detailRow("Time", apptTime)}
${detailRow("Practitioner", practitioner)}
${detailRow("Location", location)}
</table>
<p style="margin:0 0 8px">Please confirm your attendance. We look forward to seeing you.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">If you can't make it, please let us know as soon as possible.</p>`,
    },
    post_session: {
      subject: "How Was Your Session?",
      content: `<p style="margin:0 0 16px">Dear ${name},</p>
<p style="margin:0 0 16px">We hope your session went well. Thank you for visiting ZenFlow Clinic.</p>
<p style="margin:0 0 16px">If you have any questions about your treatment or would like to schedule your next visit, please don't hesitate to reach out.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">We're here to support your wellness journey.</p>`,
    },
    follow_up: {
      subject: "Follow-up Reminder",
      content: `<p style="margin:0 0 16px">Dear ${name},</p>
<p style="margin:0 0 16px">This is a friendly reminder that you may be due for a follow-up visit.</p>
<p style="margin:0 0 16px">Consistent care is key to achieving the best results from your treatment plan.</p>
<p style="margin:0 0 8px">Please contact the clinic to schedule your next appointment.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">We look forward to seeing you again.</p>`,
    },
    thank_you: {
      subject: "Thank You from ZenFlow Clinic",
      content: `<p style="margin:0 0 16px">Dear ${name},</p>
<p style="margin:0 0 16px">Thank you for visiting ZenFlow Clinic. We truly appreciate your trust in our care.</p>
<p style="margin:0 0 16px">Your feedback is valuable to us. If you have any comments about your experience, please let us know.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">Wishing you health and wellness.</p>`,
    },
    intake_form: {
      subject: "Please Complete Your Intake Form",
      content: `<p style="margin:0 0 16px">Dear ${name},</p>
<p style="margin:0 0 16px">Before your next visit, please complete your intake form. This helps us provide you with the best possible care.</p>
<p style="margin:0 0 16px">The form includes questions about your medical history, current health concerns, and consent information.</p>
<p style="margin:0 0 8px">Please contact the clinic if you have any questions about the form.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">Thank you for your cooperation.</p>`,
    },
  }

  const t = templates[template]
  if (t) {
    return {
      subject: t.subject,
      html: emailLayout(t.content),
    }
  }

  return {
    subject: "Reminder from ZenFlow Clinic",
    html: emailLayout(`<p style="margin:0 0 16px">Dear ${name},</p><p style="margin:0">${date}</p>`),
  }
}
