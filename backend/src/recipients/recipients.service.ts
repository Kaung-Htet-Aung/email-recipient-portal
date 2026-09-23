import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { UpdateRecipientDto } from './dto/update-recipient.dto';
import { QueryRecipientDto } from './dto/query-recipient.dto';

@Injectable()
export class RecipientsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(query: QueryRecipientDto) {
    const { search, departmentId, status, page = 1, limit = 50 } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeCode: { contains: search } },
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    const [recipients, total] = await Promise.all([
      this.prisma.emailRecipient.findMany({
        where,
        include: { department: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailRecipient.count({ where }),
    ]);

    return { recipients, total, page, limit };
  }

  async findOne(id: string) {
    const recipient = await this.prisma.emailRecipient.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');
    return recipient;
  }

  async create(dto: CreateRecipientDto, userId?: string) {
    const existingEmail = await this.prisma.emailRecipient.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException(`Recipient with email ${dto.email} already exists`);
    }

    const existingCode = await this.prisma.emailRecipient.findUnique({
      where: { employeeCode: dto.employeeCode },
    });
    if (existingCode) {
      throw new ConflictException(
        `Recipient with employee code ${dto.employeeCode} already exists`,
      );
    }

    const recipient = await this.prisma.emailRecipient.create({ data: dto });

    await this.auditService.record({
      userId,
      action: 'CREATE_RECIPIENT',
      entityType: 'EmailRecipient',
      entityId: recipient.id,
      newValue: {
        employeeCode: recipient.employeeCode,
        name: recipient.name,
        email: recipient.email,
      },
    });

    return recipient;
  }

  async update(id: string, dto: UpdateRecipientDto, userId?: string) {
    const recipient = await this.prisma.emailRecipient.findUnique({
      where: { id },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    if (dto.email && dto.email !== recipient.email) {
      const existing = await this.prisma.emailRecipient.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException(`Recipient with email ${dto.email} already exists`);
    }

    if (dto.employeeCode && dto.employeeCode !== recipient.employeeCode) {
      const existing = await this.prisma.emailRecipient.findUnique({
        where: { employeeCode: dto.employeeCode },
      });
      if (existing) {
        throw new ConflictException(
          `Recipient with employee code ${dto.employeeCode} already exists`,
        );
      }
    }

    const updated = await this.prisma.emailRecipient.update({
      where: { id },
      data: dto,
    });

    await this.auditService.record({
      userId,
      action: 'UPDATE_RECIPIENT',
      entityType: 'EmailRecipient',
      entityId: id,
      oldValue: {
        employeeCode: recipient.employeeCode,
        name: recipient.name,
        email: recipient.email,
        departmentId: recipient.departmentId,
        status: recipient.status,
      },
      newValue: {
        employeeCode: updated.employeeCode,
        name: updated.name,
        email: updated.email,
        departmentId: updated.departmentId,
        status: updated.status,
      },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const recipient = await this.prisma.emailRecipient.findUnique({
      where: { id },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const removed = await this.prisma.emailRecipient.delete({
      where: { id },
    });

    await this.auditService.record({
      userId,
      action: 'DELETE_RECIPIENT',
      entityType: 'EmailRecipient',
      entityId: id,
      oldValue: {
        employeeCode: recipient.employeeCode,
        name: recipient.name,
        email: recipient.email,
        departmentId: recipient.departmentId,
        status: recipient.status,
      },
    });

    return removed;
  }

  async toggleStatus(id: string, userId?: string) {
    const recipient = await this.prisma.emailRecipient.findUnique({
      where: { id },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const updated = await this.prisma.emailRecipient.update({
      where: { id },
      data: { status: recipient.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });

    await this.auditService.record({
      userId,
      action: 'TOGGLE_RECIPIENT_STATUS',
      entityType: 'EmailRecipient',
      entityId: id,
      oldValue: { status: recipient.status },
      newValue: { status: updated.status },
    });

    return updated;
  }
}