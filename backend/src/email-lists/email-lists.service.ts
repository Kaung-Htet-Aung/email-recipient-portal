import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEmailListDto } from './dto/create-email-list.dto';
import { UpdateEmailListDto } from './dto/update-email-list.dto';
import { AddRecipientDto } from './dto/add-recipient.dto';
import { UpdateRecipientTypeDto } from './dto/update-recipient-type.dto';
import { RecipientType } from '@prisma/client';

@Injectable()
export class EmailListsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(applicationId?: string) {
    const where = applicationId ? { applicationId } : {};

    const lists = await this.prisma.emailList.findMany({
      where,
      include: {
        application: true,
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return lists;
  }

  async findOne(id: string) {
    const list = await this.prisma.emailList.findUnique({
      where: { id },
      include: {
        application: true,
        recipients: {
          include: {
            recipient: {
              include: { department: true },
            },
          },
          orderBy: [{ recipientType: 'asc' }, { priority: 'asc' }],
        },
      },
    });
    if (!list) throw new NotFoundException('Email list not found');
    return list;
  }

  async create(dto: CreateEmailListDto, userId?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
    });
    if (!app) throw new NotFoundException('Application not found');

    const existing = await this.prisma.emailList.findFirst({
      where: { applicationId: dto.applicationId, code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Email list with code ${dto.code.toUpperCase()} already exists for this application`,
      );
    }

    const list = await this.prisma.emailList.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });

    await this.auditService.record({
      userId,
      action: 'CREATE_EMAIL_LIST',
      entityType: 'EmailList',
      entityId: list.id,
      newValue: {
        applicationId: list.applicationId,
        code: list.code,
        name: list.name,
        description: list.description,
      },
    });

    return list;
  }

  async update(id: string, dto: UpdateEmailListDto, userId?: string) {
    const list = await this.prisma.emailList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('Email list not found');

    if (dto.code && dto.code.toUpperCase() !== list.code) {
      const existing = await this.prisma.emailList.findFirst({
        where: { applicationId: list.applicationId, code: dto.code.toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(
          `Email list with code ${dto.code.toUpperCase()} already exists for this application`,
        );
      }
    }

    const updated = await this.prisma.emailList.update({
      where: { id },
      data: { ...dto, code: dto.code ? dto.code.toUpperCase() : undefined },
    });

    await this.auditService.record({
      userId,
      action: 'UPDATE_EMAIL_LIST',
      entityType: 'EmailList',
      entityId: id,
      oldValue: {
        code: list.code,
        name: list.name,
        description: list.description,
        status: list.status,
      },
      newValue: {
        code: updated.code,
        name: updated.name,
        description: updated.description,
        status: updated.status,
      },
    });

    return updated;
  }

  async toggleStatus(id: string, userId?: string) {
    const list = await this.prisma.emailList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('Email list not found');

    const updated = await this.prisma.emailList.update({
      where: { id },
      data: { status: list.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });

    await this.auditService.record({
      userId,
      action: 'TOGGLE_EMAIL_LIST_STATUS',
      entityType: 'EmailList',
      entityId: id,
      oldValue: { status: list.status },
      newValue: { status: updated.status },
    });

    return updated;
  }

  async addRecipient(emailListId: string, dto: AddRecipientDto, userId?: string) {
    const list = await this.prisma.emailList.findUnique({
      where: { id: emailListId },
    });
    if (!list) throw new NotFoundException('Email list not found');

    const recipient = await this.prisma.emailRecipient.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');
    if (recipient.status !== 'ACTIVE') {
      throw new BadRequestException('Inactive recipients cannot be added to email lists');
    }

    const existing = await this.prisma.emailListRecipient.findFirst({
      where: { emailListId, recipientId: dto.recipientId },
    });
    if (existing) {
      throw new ConflictException('Recipient is already in this email list');
    }

    const membership = await this.prisma.emailListRecipient.create({
      data: {
        emailListId,
        recipientId: dto.recipientId,
        recipientType: dto.recipientType || RecipientType.TO,
        priority: dto.priority || 0,
      },
      include: { recipient: true },
    });

    await this.auditService.record({
      userId,
      action: 'ADD_RECIPIENT_TO_LIST',
      entityType: 'EmailListRecipient',
      entityId: membership.id,
      newValue: {
        emailListId,
        recipientId: dto.recipientId,
        recipientEmail: recipient.email,
        recipientType: dto.recipientType,
        priority: dto.priority,
      },
    });

    return membership;
  }

  async removeRecipient(emailListId: string, recipientId: string, userId?: string) {
    const membership = await this.prisma.emailListRecipient.findFirst({
      where: { emailListId, recipientId },
      include: { recipient: true },
    });
    if (!membership) throw new NotFoundException('Recipient not found in this email list');

    const removed = await this.prisma.emailListRecipient.delete({
      where: { id: membership.id },
    });

    await this.auditService.record({
      userId,
      action: 'REMOVE_RECIPIENT_FROM_LIST',
      entityType: 'EmailListRecipient',
      entityId: membership.id,
      oldValue: {
        emailListId,
        recipientId,
        recipientEmail: membership.recipient.email,
        recipientType: membership.recipientType,
      },
    });

    return removed;
  }

  async updateRecipientType(
    emailListId: string,
    recipientId: string,
    dto: UpdateRecipientTypeDto,
    userId?: string,
  ) {
    const membership = await this.prisma.emailListRecipient.findFirst({
      where: { emailListId, recipientId },
      include: { recipient: true },
    });
    if (!membership) throw new NotFoundException('Recipient not found in this email list');

    const updated = await this.prisma.emailListRecipient.update({
      where: { id: membership.id },
      data: {
        recipientType: dto.recipientType,
        priority: dto.priority ?? membership.priority,
      },
    });

    await this.auditService.record({
      userId,
      action: 'UPDATE_RECIPIENT_TYPE',
      entityType: 'EmailListRecipient',
      entityId: membership.id,
      oldValue: {
        recipientType: membership.recipientType,
        priority: membership.priority,
      },
      newValue: {
        recipientType: updated.recipientType,
        priority: updated.priority,
      },
    });

    return updated;
  }

  async getByApplicationAndCode(applicationCode: string, listCode: string) {
    const app = await this.prisma.application.findUnique({
      where: { code: applicationCode },
    });
    if (!app) throw new NotFoundException('Application not found');

    const list = await this.prisma.emailList.findUnique({
      where: {
        applicationId_code: {
          applicationId: app.id,
          code: listCode,
        },
      },
    });
    if (!list) throw new NotFoundException('Email list not found');
    if (list.status !== 'ACTIVE') {
      throw new NotFoundException('Email list not found');
    }

    const memberships = await this.prisma.emailListRecipient.findMany({
      where: { emailListId: list.id },
      include: { recipient: true },
      orderBy: [{ recipientType: 'asc' }, { priority: 'asc' }],
    });

    const recipients = memberships
      .filter((m) => m.recipient.status === 'ACTIVE')
      .map((m) => ({
        name: m.recipient.name,
        email: m.recipient.email,
        type: m.recipientType,
      }));

    return {
      application: app.code,
      list: list.code,
      recipients,
    };
  }

  async getIntegrationList(applicationCode: string, listCode: string, requestingAppCode: string) {
    if (applicationCode !== requestingAppCode) {
      throw new ForbiddenException('Application is not allowed to access this email list');
    }
    return this.getByApplicationAndCode(applicationCode, listCode);
  }
}