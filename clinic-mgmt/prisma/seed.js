const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clean existing data in dependency order
  await prisma.auditLog.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.scheduleSlot.deleteMany()
  await prisma.planSession.deleteMany()
  await prisma.planVersion.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.treatmentPlan.deleteMany()
  await prisma.patient.deleteMany()
  console.log("Cleared existing data")

  const defaultPassword = await bcrypt.hash("password123", 12)

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: "admin@zenflow.com" },
    update: { passwordHash: defaultPassword },
    create: {
      name: "Dr. Sarah Chen",
      email: "admin@zenflow.com",
      passwordHash: defaultPassword,
      role: "admin",
      active: true,
    },
  })

  const doctor1 = await prisma.user.upsert({
    where: { email: "doctor@zenflow.com" },
    update: { passwordHash: defaultPassword },
    create: {
      name: "Dr. Michael Lin",
      email: "doctor@zenflow.com",
      passwordHash: defaultPassword,
      role: "doctor",
      active: true,
    },
  })

  const doctor2 = await prisma.user.upsert({
    where: { email: "smith@zenflow.com" },
    update: { passwordHash: defaultPassword },
    create: {
      name: "Dr. Emily Smith",
      email: "smith@zenflow.com",
      passwordHash: defaultPassword,
      role: "doctor",
      active: true,
    },
  })

  const receptionist = await prisma.user.upsert({
    where: { email: "reception@zenflow.com" },
    update: { passwordHash: defaultPassword },
    create: {
      name: "James Wilson",
      email: "reception@zenflow.com",
      passwordHash: defaultPassword,
      role: "receptionist",
      active: true,
    },
  })

  // Create patients
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        name: "Eleanor Harding",
        email: "eleanor.harding@email.com",
        phone: "(555) 019-2834",
        address: "452 Oak Avenue, Wellness City, CA 90210",
        age: 45,
        gender: "female",
        reportedProblem: "Chronic lower back tension and morning stiffness",
        referralSource: "Dr. Peterson (Orthopedics)",
        emergencyContact: "James Harding (555) 019-2835",
        notes: "Patient prefers afternoon appointments. Allergic to lavender oil.",
        consentFlags: "treatment_consent,privacy_policy",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Marcus Reed",
        email: "marcus.reed@email.com",
        phone: "(555) 847-1920",
        address: "188 Cedar Lane, Wellness City, CA 90210",
        age: 42,
        gender: "male",
        reportedProblem: "Recurring tension headaches and TMJ discomfort",
        referralSource: "Online search",
        emergencyContact: "Linda Reed (555) 847-1921",
        notes: "Responds well to auricular acupuncture.",
        consentFlags: "treatment_consent,privacy_policy",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Sarah Lin",
        email: "sarah.lin@email.com",
        phone: "(555) 392-8475",
        address: "731 Pine Street, Wellness City, CA 90210",
        age: 28,
        gender: "female",
        reportedProblem: "Anxiety and insomnia related to work stress",
        referralSource: "Friend referral - Jessica M.",
        emergencyContact: "Tom Lin (555) 392-8476",
        notes: "Prefers calming music during sessions. Sensitive to needles - use thinnest gauge.",
        consentFlags: "treatment_consent,privacy_policy",
      },
    }),
    prisma.patient.create({
      data: {
        name: "James Wilson",
        email: null,
        phone: "(555) 112-4433",
        address: "920 Maple Drive, Wellness City, CA 90210",
        age: 55,
        gender: "male",
        reportedProblem: "Sciatica and hip pain, worsened after long drives",
        referralSource: "Dr. Rivera (Pain Management)",
        emergencyContact: "Nancy Wilson (555) 112-4434",
        notes: "Has history of knee replacement (2019). Need to avoid certain leg positions.",
        consentFlags: "treatment_consent,privacy_policy",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Elena Rodriguez",
        email: "elena.rodriguez@email.com",
        phone: "(555) 761-2345",
        address: "234 Sunset Blvd, Wellness City, CA 90210",
        age: 38,
        gender: "female",
        reportedProblem: "Migraine with aura, 3-4 episodes per month",
        referralSource: "Neurology referral",
        emergencyContact: "Carlos Rodriguez (555) 761-2346",
        notes: "Migraines typically start on left side. Triggers include red wine and lack of sleep.",
        consentFlags: "treatment_consent,privacy_policy",
      },
    }),
    prisma.patient.create({
      data: {
        name: "Robert Tanaka",
        email: null,
        phone: "(555) 554-3322",
        address: "567 Cherry Blossom Way, Wellness City, CA 90210",
        age: 62,
        gender: "male",
        reportedProblem: "Post-stroke rehabilitation - left side weakness and numbness",
        referralSource: "Rehabilitation Center of CA",
        emergencyContact: "Yuki Tanaka (555) 554-3323",
        notes: "Uses cane for mobility. Sessions should include scalp acupuncture protocol.",
        consentFlags: "treatment_consent,privacy_policy",
      },
    }),
  ])

  console.log("Created patients")

  // Create treatment plans
  const now = new Date()
  const planConfigs = [
    { patientIdx: 0, doctor: doctor1, stagesTotal: 3, sittingsTotal: 10, currentStage: 2, currentSittingNumber: 5, intervalDays: 7, condition: "Chronic Lower Back Pain (Qi Stagnation pattern)", notes: "Focus on BL-23, BL-25, and GV-3 points. Add moxibustion at each session.", version: 1, startDaysBehind: 70 },
    { patientIdx: 1, doctor: doctor2, stagesTotal: 2, sittingsTotal: 6, currentStage: 1, currentSittingNumber: 3, intervalDays: 5, condition: "Tension Headaches with TMJ involvement", notes: "Include GB-20, GB-21, ST-6, and LI-4. Consider auricular template.", version: 1, startDaysBehind: 30 },
    { patientIdx: 2, doctor: doctor1, stagesTotal: 3, sittingsTotal: 8, currentStage: 1, currentSittingNumber: 2, intervalDays: 7, condition: "Anxiety and Insomnia (Heart and Kidney not communicating)", notes: "HT-7, PC-6, KI-3, and Yintang (EX-HN3). Add ear press seeds for between sessions.", version: 1, startDaysBehind: 20 },
    { patientIdx: 3, doctor: doctor2, stagesTotal: 2, sittingsTotal: 8, currentStage: 1, currentSittingNumber: 4, intervalDays: 4, condition: "Sciatica (Bladder Channel pattern)", notes: "BL-25, BL-37, BL-40, GB-30, and GB-34. Avoid right knee area.", version: 2, startDaysBehind: 35 },
  ]

  const plans = await Promise.all(
    planConfigs.map((cfg) =>
      prisma.treatmentPlan.create({
        data: {
          patientId: patients[cfg.patientIdx].id,
          doctorId: cfg.doctor.id,
          condition: cfg.condition,
          stagesTotal: cfg.stagesTotal,
          sittingsTotal: cfg.sittingsTotal,
          currentStage: cfg.currentStage,
          currentSittingNumber: cfg.currentSittingNumber,
          intervalDays: cfg.intervalDays,
          startDate: new Date(now.getTime() - cfg.startDaysBehind * 24 * 60 * 60 * 1000),
          status: "active",
          specialNotes: cfg.notes,
          version: cfg.version,
        },
      })
    )
  )

  // Create plan versions
  for (const plan of plans) {
    await prisma.planVersion.create({
      data: {
        planId: plan.id,
        version: plan.version,
        stagesTotal: plan.stagesTotal,
        sittingsTotal: plan.sittingsTotal,
        intervalDays: plan.intervalDays,
        condition: plan.condition,
        specialNotes: plan.specialNotes,
        status: plan.status,
        changeNotes: "Initial treatment plan created",
      },
    })
  }

  // Add a version 2 for the sciatica plan to test versioning
  await prisma.planVersion.create({
    data: {
      planId: plans[3].id,
      version: 1,
      stagesTotal: 1,
      sittingsTotal: 5,
      intervalDays: 7,
      condition: "Sciatica (initial assessment)",
      specialNotes: "Preliminary treatment protocol",
      status: "superseded",
      changeNotes: "Initial version - adjusted after patient feedback",
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  })

  console.log("Created treatment plans and versions")

  // Create plan sessions
  for (let pi = 0; pi < planConfigs.length; pi++) {
    const cfg = planConfigs[pi]
    const plan = plans[pi]
    const sessions = []
    let stage = 1
    let sittingInStage = 1
    let dayOffset = 0
    for (let s = 1; s <= cfg.sittingsTotal; s++) {
      const sessionDate = new Date(now.getTime() - (cfg.startDaysBehind - dayOffset) * 24 * 60 * 60 * 1000)
      sessions.push({
        planId: plan.id,
        sessionNumber: s,
        stageNo: stage,
        sittingNo: s,
        status: s <= cfg.currentSittingNumber ? "completed" : "scheduled",
        scheduledDate: sessionDate,
      })
      dayOffset += cfg.intervalDays
      sittingInStage++
      if (sittingInStage > Math.round(cfg.sittingsTotal / cfg.stagesTotal)) {
        stage++
        sittingInStage = 1
      }
    }
    await prisma.planSession.createMany({ data: sessions })
  }

  console.log("Created plan sessions")

  // Create visits
  const visitDates = [
    { pIdx: 0, d: -21, s: 1, sn: 1 },
    { pIdx: 0, d: -14, s: 1, sn: 2 },
    { pIdx: 0, d: -10, s: 1, sn: 3 },
    { pIdx: 0, d: -7, s: 1, sn: 4 },
    { pIdx: 0, d: -3, s: 2, sn: 5 },
    { pIdx: 1, d: -15, s: 1, sn: 1 },
    { pIdx: 1, d: -10, s: 1, sn: 2 },
    { pIdx: 1, d: -5, s: 1, sn: 3 },
    { pIdx: 2, d: -14, s: 1, sn: 1 },
    { pIdx: 2, d: -7, s: 1, sn: 2 },
    { pIdx: 3, d: -16, s: 1, sn: 1 },
    { pIdx: 3, d: -12, s: 1, sn: 2 },
    { pIdx: 3, d: -8, s: 1, sn: 3 },
    { pIdx: 3, d: -4, s: 1, sn: 4 },
    { pIdx: 4, d: -20, s: 1, sn: 1 },
    { pIdx: 5, d: -18, s: 1, sn: 1 },
    { pIdx: 5, d: -11, s: 1, sn: 2 },
  ]

  const visitNotes = [
    "Patient reported 30% reduction in morning stiffness. Adjusted L4-L5 needle depth. Applied mild heat therapy.",
    "Continued improvement noted. Patient sleeping better. Added BL-26 to protocol.",
    "Good session. Patient was more relaxed. Range of motion improving.",
    "Plateau noted. Modified point selection to include more distal points.",
    "Significant improvement. Moving to stage 2 - core strengthening phase.",
    "Initial consultation and first treatment. Patient is responsive to needling.",
    "TMJ tension reducing. Patient practicing jaw relaxation exercises between sessions.",
    "Headache frequency reduced from daily to 3x/week. Progressing well.",
    "First session. Patient was anxious but tolerated needles well. Used calming points.",
    "Patient reports sleeping 6 hours straight for first time in months. Continue protocol.",
    "Initial assessment complete. Sciatica rated 7/10 pain. Started BL treatment protocol.",
    "Pain reduced to 5/10. Patient can sit for longer periods.",
    "Good progress. Pain at 3/10. Adding GB meridian points.",
    "Pain minimal today. Patient discharged with home care instructions for maintenance.",
    "First migraine treatment. Patient reported tension in neck and shoulders.",
    "Post-stroke intake. Left side sensation improving slightly after first session.",
    "Continued improvement in left side mobility. Added limb stimulation protocol.",
  ]

  for (let i = 0; i < visitDates.length; i++) {
    const v = visitDates[i]
    const visitDate = new Date(now.getTime() + v.d * 24 * 60 * 60 * 1000)
    visitDate.setHours(10, 0, 0, 0)

    await prisma.visit.create({
      data: {
        patientId: patients[v.pIdx].id,
        planId: plans[Math.min(v.pIdx, plans.length - 1)].id,
        dateTime: visitDate,
        stageNo: v.s,
        sittingNo: v.sn,
        notes: visitNotes[i] || "Routine session completed.",
        visitStatus: "completed",
        receiptNumber: `ZF-${visitDate.getTime()}-${String(v.pIdx + 1).padStart(4, "0")}`,
      },
    })
  }

  console.log("Created visits")

  // Create schedule slots
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const doctors = [doctor1, doctor2]

  // Track booked slots per patient to prevent double-booking
  const patientSlotCount = new Map()
  for (const p of patients) patientSlotCount.set(p.id, 0)

  for (let d = 0; d < 5; d++) {
    const day = new Date(today.getTime() + d * 24 * 60 * 60 * 1000)
    const dayOfWeek = day.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue // skip weekends

    for (const doc of doctors) {
      // Available slots 8 AM to 12 PM
      for (let h = 8; h < 12; h++) {
        const start = new Date(day)
        start.setHours(h, 0, 0, 0)
        const end = new Date(day)
        end.setHours(h + 1, 0, 0, 0)

        // Assign patient to every other slot (simulate bookings)
        const isBooked = (h + d) % 2 === 0
        let patientId = null
        if (isBooked) {
          // Rotate through patients ensuring no double-book
          const sortedPatients = [...patients].sort((a, b) => patientSlotCount.get(a.id) - patientSlotCount.get(b.id))
          patientId = sortedPatients[0].id
          patientSlotCount.set(patientId, patientSlotCount.get(patientId) + 1)
        }

        await prisma.scheduleSlot.create({
          data: {
            doctorId: doc.id,
            patientId,
            startTime: start,
            endTime: end,
            slotType: "available",
            status: isBooked ? "booked" : "free",
          },
        })
      }
      // Lunch block
      const lunchStart = new Date(day)
      lunchStart.setHours(12, 0, 0, 0)
      const lunchEnd = new Date(day)
      lunchEnd.setHours(13, 0, 0, 0)
      await prisma.scheduleSlot.create({
        data: {
          doctorId: doc.id,
          startTime: lunchStart,
          endTime: lunchEnd,
          slotType: "lunch",
          status: "blocked",
        },
      })
      // Afternoon slots 1 PM to 5 PM
      for (let h = 13; h < 17; h++) {
        const start = new Date(day)
        start.setHours(h, 0, 0, 0)
        const end = new Date(day)
        end.setHours(h + 1, 0, 0, 0)

        const isBooked = (h + d) % 2 === 1
        let patientId = null
        if (isBooked) {
          const sortedPatients = [...patients].sort((a, b) => patientSlotCount.get(a.id) - patientSlotCount.get(b.id))
          patientId = sortedPatients[0].id
          patientSlotCount.set(patientId, patientSlotCount.get(patientId) + 1)
        }

        await prisma.scheduleSlot.create({
          data: {
            doctorId: doc.id,
            patientId,
            startTime: start,
            endTime: end,
            slotType: "available",
            status: isBooked ? "booked" : "free",
          },
        })
      }
    }
  }

  console.log("Created schedule slots")

  // Create reminders (channel matched to patient capabilities)
  const reminderTemplates = ["24h_appointment", "2h_appointment", "post_session", "follow_up"]
  for (let i = 0; i < 8; i++) {
    const p = patients[i % patients.length]
    const sendAt = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000)
    sendAt.setHours(9, 0, 0, 0)

    // Pick channel patient supports
    const availableChannels = ["email"]
    if (p.email) availableChannels.push("email")
    const channel = availableChannels[i % availableChannels.length]

    await prisma.reminder.create({
      data: {
        patientId: p.id,
        channel,
        template: reminderTemplates[i % reminderTemplates.length],
        sendAt,
        status: i < 3 ? "sent" : i === 5 ? "failed" : "pending",
        deliveryAttempts: i < 3 ? 1 : i === 5 ? 3 : 0,
        lastError: i === 5 ? "Provider returned 500 error" : null,
      },
    })
  }

  console.log("Created reminders")

  // Create audit logs
  const actors = [admin, doctor1, receptionist]
  const actions = ["create", "update", "view"]
  const entities = ["Patient", "TreatmentPlan", "Visit", "User", "Reminder"]

  for (let i = 0; i < 20; i++) {
    const logDate = new Date(now.getTime() - i * 2 * 60 * 60 * 1000)
    const entityType = entities[i % entities.length]
    const action = actions[i % actions.length]
    await prisma.auditLog.create({
      data: {
        actorId: actors[i % actors.length].id,
        entityType,
        action,
        ipOrDevice: "192.168.1.100",
        before: action === "update" ? JSON.stringify({ name: "Previous Name" }) : null,
        after: action !== "delete" ? JSON.stringify({ name: "Updated Name", status: "active" }) : null,
        createdAt: logDate,
      },
    })
  }

  console.log("Created audit logs")

  // Create clinic settings
  const settings = [
    { key: "clinic_name", value: "ZenFlow Clinic" },
    { key: "clinic_address", value: "123 Healing Way, Suite 400, Wellness City, CA 90210" },
    { key: "clinic_phone", value: "(555) 123-4567" },
    { key: "clinic_email", value: "noreply@srilalithasignaturenoodles.online" },
    { key: "reminder_24h", value: "true" },
    { key: "reminder_2h", value: "true" },
    { key: "reminder_post_session", value: "true" },
    { key: "reminder_follow_up", value: "true" },
    { key: "reminder_channel_email", value: "true" },
    { key: "booking_double_booking", value: "false" },
    { key: "booking_default_duration", value: "60" },
    { key: "booking_buffer", value: "10" },
    { key: "booking_max_per_day", value: "12" },
    { key: "receipt_show_diagnosis", value: "true" },
    { key: "receipt_footer", value: "Thank you for choosing ZenFlow Clinic. Wishing you health and balance." },
    { key: "privacy_retention_days", value: "365" },
    { key: "privacy_audit_retention_days", value: "730" },
  ]

  for (const s of settings) {
    await prisma.clinicSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    })
  }

  console.log("Created clinic settings")
  console.log("")
  console.log("✅ Seed completed successfully!")
  console.log("")
  console.log("Demo login credentials (password for all: password123):")
  console.log("  Admin:         admin@zenflow.com")
  console.log("  Doctor:        doctor@zenflow.com")
  console.log("  Doctor 2:      smith@zenflow.com")
  console.log("  Receptionist:  reception@zenflow.com")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
