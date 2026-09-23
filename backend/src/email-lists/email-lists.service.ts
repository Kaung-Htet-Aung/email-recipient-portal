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
import type { EmailListRecipient } from '@prisma/client';

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
          orderBy: [{ recipientType: 'desc' }, { priority: 'asc' }],
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
      data: {
        code: dto.code ? dto.code.toUpperCase() : undefined,
        name: dto.name,
        description: dto.description,
      },
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

  async remove(id: string, userId?: string) {
    const list = await this.prisma.emailList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('Email list not found');

    const removed = await this.prisma.emailList.delete({ where: { id } });

    await this.auditService.record({
      userId,
      action: 'DELETE_EMAIL_LIST',
      entityType: 'EmailList',
      entityId: id,
      oldValue: {
        applicationId: list.applicationId,
        code: list.code,
        name: list.name,
        description: list.description,
        status: list.status,
      },
    });

    return removed;
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

    const anchorId = dto.beforeRecipientId ?? dto.afterRecipientId;

    let priority = dto.priority ?? 0;
    let placement: { before?: string; after?: string } | undefined;

    if (anchorId) {
      const isBefore = Boolean(dto.beforeRecipientId);
      const anchor = await this.prisma.emailListRecipient.findFirst({
        where: { id: anchorId, emailListId },
      });
      if (!anchor) {
        throw new NotFoundException('Position recipient not found in this email list');
      }

      const memberships = await this.prisma.emailListRecipient.findMany({
        where: { emailListId },
        orderBy: [{ recipientType: 'desc' }, { priority: 'asc' }],
      });

      const orderedIds = memberships.map((m) => m.id);
      const anchorIndex = orderedIds.indexOf(anchor.id);
      const insertIndex = isBefore ? anchorIndex : anchorIndex + 1;
      orderedIds.splice(insertIndex, 0, 'NEW');

      priority = insertIndex;
      placement = {
        before: isBefore ? anchor.recipientId : undefined,
        after: !isBefore ? anchor.recipientId : undefined,
      };

      const updates = orderedIds
        .map((id, idx) =>
          id === 'NEW'
            ? null
            : this.prisma.emailListRecipient.update({
                where: { id },
                data: { priority: idx },
              }),
        )
        .filter((op): op is NonNullable<typeof op> => op !== null);

      const membership = this.prisma.emailListRecipient.create({
        data: {
          emailListId,
          recipientId: dto.recipientId,
          recipientType: dto.recipientType || 'TO',
          role: dto.role,
          priority,
        },
        include: { recipient: true },
      });

      const results = await this.prisma.$transaction([
        ...updates,
        membership,
      ]);
      const created = results[results.length - 1];

      await this.auditService.record({
        userId,
        action: 'ADD_RECIPIENT_TO_LIST',
        entityType: 'EmailListRecipient',
        entityId: created.id,
        newValue: {
          emailListId,
          recipientId: dto.recipientId,
          recipientEmail: recipient.email,
          recipientType: created.recipientType,
          role: created.role,
          priority: created.priority,
          placement,
        },
      });

      return created;
    }

    const membership = await this.prisma.emailListRecipient.create({
      data: {
        emailListId,
        recipientId: dto.recipientId,
        recipientType: dto.recipientType || 'TO',
        role: dto.role,
        priority,
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
        recipientType: membership.recipientType,
        role: membership.role,
        priority: membership.priority,
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
        role: membership.role,
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

    const anchorId = dto.beforeRecipientId ?? dto.afterRecipientId;

    let updated: EmailListRecipient;
    let placement: { before?: string; after?: string } | undefined;

    if (anchorId) {
      if (anchorId === membership.id) {
        throw new BadRequestException('Cannot position a recipient relative to itself');
      }
      const isBefore = Boolean(dto.beforeRecipientId);
      const anchor = await this.prisma.emailListRecipient.findFirst({
        where: { id: anchorId, emailListId },
      });
      if (!anchor) {
        throw new NotFoundException('Position recipient not found in this email list');
      }

      const memberships = await this.prisma.emailListRecipient.findMany({
        where: { emailListId },
        orderBy: [{ recipientType: 'desc' }, { priority: 'asc' }],
      });

      const orderedIds = memberships
        .filter((m) => m.id !== membership.id)
        .map((m) => m.id);
      const anchorIndex = orderedIds.indexOf(anchor.id);
      const insertIndex = isBefore ? anchorIndex : anchorIndex + 1;
      orderedIds.splice(insertIndex, 0, membership.id);

      placement = {
        before: isBefore ? anchor.recipientId : undefined,
        after: !isBefore ? anchor.recipientId : undefined,
      };

      const updates = orderedIds.map((id, idx) =>
        id === membership.id
          ? this.prisma.emailListRecipient.update({
              where: { id },
              data: {
                recipientType: dto.recipientType,
                role: dto.role,
                priority: idx,
              },
            })
          : this.prisma.emailListRecipient.update({
              where: { id },
              data: { priority: idx },
            }),
      );

      const results = await this.prisma.$transaction(updates);
      const selfResult = results.filter((r) => r.id === membership.id)[0];
      updated = selfResult;
    } else {
      updated = await this.prisma.emailListRecipient.update({
        where: { id: membership.id },
        data: {
          recipientType: dto.recipientType,
          role: dto.role,
        },
      });
    }

    await this.auditService.record({
      userId,
      action: 'UPDATE_RECIPIENT_TYPE',
      entityType: 'EmailListRecipient',
      entityId: membership.id,
      oldValue: {
        recipientType: membership.recipientType,
        role: membership.role,
        priority: membership.priority,
      },
      newValue: {
        recipientType: updated.recipientType,
        role: updated.role,
        priority: updated.priority,
        ...(placement ? { placement } : {}),
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
      orderBy: [{ recipientType: 'desc' }, { priority: 'asc' }],
    });

    const recipients = memberships
      .filter((m) => m.recipient.status === 'ACTIVE')
      .map((m) => ({
        name: m.recipient.name,
        email: m.recipient.email,
        type: m.recipientType,
        role: m.role,
        priority: m.priority,
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