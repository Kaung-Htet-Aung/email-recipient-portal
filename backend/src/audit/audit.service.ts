import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecord {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async record(record: AuditRecord) {
    return this.prisma.auditLog.create({
      data: {
        userId: record.userId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        oldValue: record.oldValue as any,
        newValue: record.newValue as any,
        ipAddress: record.ipAddress,
      },
    });
  }

  async findAll(query: {
    search?: string;
    entityType?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      entityType,
      action,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { entityType: { contains: search } },
        { entityId: { contains: search } },
      ];
    }
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });
  }
}