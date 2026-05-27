import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash("password123", 12)
  const users = [
    { name: "Dr. Sarah Chen", email: "admin@zenflow.com", role: "admin" },
    { name: "Dr. Michael Lin", email: "doctor@zenflow.com", role: "doctor" },
    { name: "Dr. Emily Smith", email: "smith@zenflow.com", role: "doctor" },
    { name: "Lisa Receptionist", email: "reception@zenflow.com", role: "receptionist" },
  ]
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, role: u.role, active: true },
      create: { ...u, passwordHash: hash, active: true },
    })
    console.log("Created: " + u.email)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
