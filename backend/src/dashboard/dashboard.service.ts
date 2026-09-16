import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [applications, emailLists, recipients, departments] =
      await Promise.all([
        this.prisma.application.count(),
        this.prisma.emailList.count(),
        this.prisma.emailRecipient.count(),
        this.prisma.department.count(),
      ]);

    const [activeLists, inactiveLists] = await Promise.all([
      this.prisma.emailList.count({ where: { status: 'ACTIVE' } }),
      this.prisma.emailList.count({ where: { status: 'INACTIVE' } }),
    ]);

    const [activeRecipients, inactiveRecipients] = await Promise.all([
      this.prisma.emailRecipient.count({ where: { status: 'ACTIVE' } }),
      this.prisma.emailRecipient.count({ where: { status: 'INACTIVE' } }),
    ]);

    const [recentAuditLogs, recentLists, recentRecipients] = await Promise.all([
      this.prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      this.prisma.emailList.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          application: true,
          _count: { select: { recipients: true } },
        },
      }),
      this.prisma.emailRecipient.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { department: true },
      }),
    ]);

    return {
      counts: {
        applications,
        emailLists,
        recipients,
        departments,
        activeLists,
        inactiveLists,
        activeRecipients,
        inactiveRecipients,
      },
      recentAuditLogs,
      recentLists,
      recentRecipients,
    };
  }
}