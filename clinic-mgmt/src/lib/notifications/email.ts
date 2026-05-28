const RESEND_API = "https://api.resend.com"

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

const BRAND_COLOR = "#059669"
const BG_COLOR = "#f0fdf4"
const CARD_BG = "#ffffff"
const TEXT_COLOR = "#1e293b"
const MUTED_COLOR = "#64748b"
const LIGHT_BORDER = "#d1fae5"

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_COLOR}">
<tr><td style="padding:32px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="520" align="center" style="max-width:520px;margin:0 auto;background:${CARD_BG};border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
<tr><td style="padding:0">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND_COLOR};padding:28px 36px">
<tr><td style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">ZenFlow Clinic</td></tr>
<tr><td style="color:#ffffffcc;font-size:13px;padding-top:2px">Acupuncture &bull; Wellness &bull; Healing</td></tr>
</table>
</td></tr>
<tr><td style="padding:36px;color:${TEXT_COLOR};font-size:15px;line-height:1.7">${content}</td></tr>
<tr><td style="padding:0 36px 32px">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #e2e8f0;padding-top:20px">
<tr><td style="color:${MUTED_COLOR};font-size:12px;line-height:1.6">
<p style="margin:0">This email was sent by <strong>ZenFlow Clinic</strong></p>
<p style="margin:6px 0 0">123 Healing Way, Wellness District</p>
<p style="margin:2px 0 0">Phone: +1 (555) 123-4567</p>
<p style="margin:10px 0 0;font-style:italic">Please do not reply to this email. Contact the clinic directly if needed.</p>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function detailCard(rows: { label: string; value: string }[]): string {
  if (rows.every(r => !r.value)) return ""
  const items = rows
    .filter(r => r.value)
    .map((r, i) => `<tr${i > 0 ? ` style="border-top:1px solid ${LIGHT_BORDER}"` : ""}>
      <td style="padding:10px 16px;color:${MUTED_COLOR};font-size:12px;width:100px;vertical-align:top;text-transform:uppercase;letter-spacing:0.3px">${r.label}</td>
      <td style="padding:10px 16px;font-size:14px;font-weight:500">${r.value}</td>
    </tr>`)
    .join("")
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafafa;border-radius:10px;margin:0 0 20px;border:1px solid ${LIGHT_BORDER};overflow:hidden">
${items}
</table>`
}

function ctaButton(text: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
<tr><td style="background:${BRAND_COLOR};border-radius:8px;text-align:center;padding:12px 28px">
<span style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">${text}</span>
</td></tr>
</table>`
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
  const details = [
    { label: "Date", value: apptDate },
    { label: "Time", value: apptTime },
    { label: "Practitioner", value: practitioner },
    { label: "Location", value: location },
  ]

  const templates: Record<string, { subject: string; content: string }> = {
    booking_confirmation: {
      subject: "Appointment Confirmed at ZenFlow Clinic",
      content: `<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:600;color:${BRAND_COLOR}">Your appointment is confirmed ✓</p>
<p style="margin:0 0 20px">We look forward to welcoming you. Here's a quick summary of your visit:</p>
${detailCard(details)}
${ctaButton("Add to Calendar")}
<p style="margin:0 0 8px">Please arrive <strong>10 minutes early</strong> to complete any necessary paperwork.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">Need to reschedule or cancel? Just give us a call — we're happy to help.</p>`,
    },
    "24h_appointment": {
      subject: "Reminder: Your Appointment is Tomorrow",
      content: `<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:600;color:${BRAND_COLOR}">Your visit at ZenFlow Clinic is <strong>tomorrow</strong> 🌿</p>
<p style="margin:0 0 20px">Here's a friendly reminder of your appointment details:</p>
${detailCard(details)}
${ctaButton("Confirm Attendance")}
<p style="margin:0 0 8px">Please arrive <strong>10 minutes early</strong>. Wear comfortable clothing.</p>
<p style="margin:0 0 4px;color:${MUTED_COLOR};font-size:13px">If you need to reschedule, please contact us at least 4 hours in advance.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">We look forward to seeing you!</p>`,
    },
    "2h_appointment": {
      subject: "Your Appointment is in 2 Hours",
      content: `<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:600;color:${BRAND_COLOR}">See you soon! Your appointment is in <strong>2 hours</strong> ⏰</p>
<p style="margin:0 0 20px">Here's a quick recap of your appointment details:</p>
${detailCard(details)}
<p style="margin:0 0 8px">We're looking forward to seeing you. Your wellness journey matters to us.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">Running late or need to cancel? Please let us know as soon as possible.</p>`,
    },
    post_session: {
      subject: "How Was Your Session at ZenFlow Clinic?",
      content: `<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p>
<p style="margin:0 0 16px">We hope you're feeling refreshed after your session. Thank you for trusting us with your care.</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafafa;border-radius:10px;margin:0 0 20px;border:1px solid ${LIGHT_BORDER};overflow:hidden">
<tr><td style="padding:16px">
<p style="margin:0 0 8px;font-weight:600;font-size:14px">Post-Session Care Tips</p>
<p style="margin:0 0 6px;font-size:13px;color:${TEXT_COLOR}">• Stay hydrated — drink plenty of water</p>
<p style="margin:0 0 6px;font-size:13px;color:${TEXT_COLOR}">• Rest the treated areas for the remainder of the day</p>
<p style="margin:0 0 6px;font-size:13px;color:${TEXT_COLOR}">• Avoid strenuous activity for 24 hours</p>
<p style="margin:0 0 6px;font-size:13px;color:${TEXT_COLOR}">• Apply heat if you feel soreness in treated areas</p>
<p style="margin:0;font-size:13px;color:${TEXT_COLOR}">• Follow your treatment plan and keep your next appointment</p>
</td></tr>
</table>
${ctaButton("Book Your Next Session")}
<p style="margin:0 0 8px">Questions about your treatment? We're just a call away.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">Wishing you balance and wellness.</p>`,
    },
    follow_up: {
      subject: "Time for a Follow-Up Visit?",
      content: `<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p>
<p style="margin:0 0 16px">It's been a while since your last visit — we hope you're doing well.</p>
<p style="margin:0 0 16px">Consistent care is the key to lasting results. A follow-up session can help maintain your progress and address any new concerns.</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafafa;border-radius:10px;margin:0 0 20px;border:1px solid ${LIGHT_BORDER};overflow:hidden">
<tr><td style="padding:16px">
<p style="margin:0 0 4px;font-weight:600;font-size:14px;color:${BRAND_COLOR}">Why Follow Up?</p>
<p style="margin:0;font-size:13px;color:${MUTED_COLOR}">Regular sessions help reinforce treatment benefits, track your progress, and adjust your care plan as you heal.</p>
</td></tr>
</table>
${ctaButton("Schedule Your Follow-Up")}
<p style="margin:0 0 8px">Call us to find a time that works for you.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">We look forward to seeing you again.</p>`,
    },
    thank_you: {
      subject: "Thank You from ZenFlow Clinic",
      content: `<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p>
<p style="margin:0 0 16px">On behalf of the entire team at ZenFlow Clinic, thank you for choosing us for your care.</p>
<p style="margin:0 0 16px">Your trust means the world to us, and we're honored to be part of your wellness journey.</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafafa;border-radius:10px;margin:0 0 20px;border:1px solid ${LIGHT_BORDER};overflow:hidden">
<tr><td style="padding:16px;text-align:center">
<p style="margin:0;font-size:13px;color:${MUTED_COLOR}">"Health is the greatest gift. Thank you for letting us be a part of yours."</p>
</td></tr>
</table>
${ctaButton("Share Your Feedback")}
<p style="margin:0 0 8px">Your feedback helps us improve. If you have a moment, we'd love to hear about your experience.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">Wishing you health and happiness.</p>`,
    },
    intake_form: {
      subject: "Please Complete Your Intake Form",
      content: `<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p>
<p style="margin:0 0 16px">We're preparing for your upcoming visit. To ensure the best possible care, please complete your intake form before you arrive.</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafafa;border-radius:10px;margin:0 0 20px;border:1px solid ${LIGHT_BORDER};overflow:hidden">
<tr><td style="padding:16px">
<p style="margin:0 0 8px;font-weight:600;font-size:14px">What to Expect</p>
<p style="margin:0 0 6px;font-size:13px;color:${TEXT_COLOR}">✓ Medical history &amp; current health concerns</p>
<p style="margin:0 0 6px;font-size:13px;color:${TEXT_COLOR}">✓ Treatment goals &amp; expectations</p>
<p style="margin:0 0 6px;font-size:13px;color:${TEXT_COLOR}">✓ Consent &amp; privacy acknowledgment</p>
<p style="margin:0;font-size:13px;color:${TEXT_COLOR}">✓ Emergency contact information</p>
</td></tr>
</table>
${ctaButton("Complete Your Intake Form")}
<p style="margin:0 0 8px">The form takes about <strong>5 minutes</strong> to complete.</p>
<p style="margin:0;color:${MUTED_COLOR};font-size:13px">Questions? Call us — we're happy to walk you through it.</p>`,
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
    html: emailLayout(`<p style="margin:0 0 20px;font-size:16px">Dear ${name},</p><p style="margin:0">${date}</p>`),
  }
}
