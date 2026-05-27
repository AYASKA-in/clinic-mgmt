import prisma from "./db"
import { AuditLog } from "@prisma/client"

export async function createAuditLog(params: {
  actorId?: string
  entityType: string
  entityId?: string
  action: string
  before?: any
  after?: any
  ipOrDevice?: string
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      before: params.before ? JSON.stringify(params.before) : null,
      after: params.after ? JSON.stringify(params.after) : null,
      ipOrDevice: params.ipOrDevice,
    },
  })
}

export async function getAuditLogs(params: {
  entityType?: string
  action?: string
  actorId?: string
  limit?: number
  offset?: number
}) {
  const where: any = {}
  if (params.entityType) where.entityType = params.entityType
  if (params.action) where.action = params.action
  if (params.actorId) where.actorId = params.actorId

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: params.limit || 50,
    skip: params.offset || 0,
  })
  const total = await prisma.auditLog.count({ where })

  return { logs, total }
}
