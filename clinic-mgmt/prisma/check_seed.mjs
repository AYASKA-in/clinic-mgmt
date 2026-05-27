import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  console.log('=== Patients ===')
  const patients = await prisma.patient.findMany({ select: { id: true, name: true, email: true } })
  console.log('Count:', patients.length)
  patients.forEach(p => console.log(' ', p.name, '| email:', p.email || '(none)'))
  console.log('')

  console.log('=== Plan Sessions ===')
  const sessions = await prisma.planSession.findMany({ select: { planId: true, sessionNumber: true, stageNo: true, sittingNo: true, status: true } })
  console.log('Count:', sessions.length)
  console.log('')

  console.log('=== Treatment Plans ===')
  const plans = await prisma.treatmentPlan.findMany({ select: { id: true, patientId: true, startDate: true, sittingsTotal: true } })
  plans.forEach(p => console.log('  plan:', p.id.slice(0,8), 'patient:', p.patientId.slice(0,8), 'startDate:', p.startDate, 'sittings:', p.sittingsTotal))
  console.log('')

  console.log('=== Schedule Slots (checking overlaps) ===')
  const slots = await prisma.scheduleSlot.findMany({ select: { doctorId: true, startTime: true, endTime: true, patientId: true, status: true } })
  let overlaps = 0
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (slots[i].doctorId === slots[j].doctorId && slots[i].startTime < slots[j].endTime && slots[j].startTime < slots[i].endTime) {
        console.log('OVERLAP:', slots[i].doctorId.slice(0,8), slots[i].startTime, '-', slots[i].endTime, 'and', slots[j].startTime, '-', slots[j].endTime)
        overlaps++
      }
    }
  }
  console.log(overlaps === 0 ? 'No overlaps found' : `Found ${overlaps} overlaps`)
  console.log('')

  console.log('=== Reminders ===')
  const reminders = await prisma.reminder.findMany({ include: { patient: { select: { name: true, email: true } } } })
  reminders.forEach(r => console.log('  to:', r.patient.name, 'channel:', r.channel, 'email:', r.patient.email || '(none)', 'status:', r.status))
  console.log('')

  console.log('=== Visits (receipt format) ===')
  const visits = await prisma.visit.findMany({ take: 5, select: { receiptNumber: true } })
  visits.forEach(v => console.log('  receipt:', v.receiptNumber))

  await prisma.$disconnect()
}
check().catch(e => { console.error(e); process.exit(1) })
