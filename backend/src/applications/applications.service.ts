import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.application.findMany({
      include: {
        _count: { select: { emailLists: true, credentials: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        emailLists: {
          include: {
            _count: { select: { recipients: true } },
          },
        },
        credentials: true,
        _count: { select: { emailLists: true, credentials: true } },
      },
    });

    if (!app) throw new NotFoundException('Application not found');
    return {
      ...app,
      credentials: app.credentials.map(({ apiKey: _apiKey, ...credential }) => credential),
    };
  }

  async findByCode(code: string) {
    return this.prisma.application.findUnique({ where: { code } });
  }

  async create(dto: CreateApplicationDto, userId?: string) {
    const existing = await this.prisma.application.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(
        `Application with code ${dto.code.toUpperCase()} already exists`,
      );
    }

    const application = await this.prisma.application.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
      },
    });

    await this.auditService.record({
      userId,
      action: 'CREATE_APPLICATION',
      entityType: 'Application',
      entityId: application.id,
      newValue: {
        code: application.code,
        name: application.name,
        description: application.description,
      },
    });

    return application;
  }

  async update(id: string, dto: UpdateApplicationDto, userId?: string) {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    if (dto.code && dto.code.toUpperCase() !== app.code) {
      const existing = await this.prisma.application.findUnique({
        where: { code: dto.code.toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(
          `Application with code ${dto.code.toUpperCase()} already exists`,
        );
      }
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
      },
    });

    await this.auditService.record({
      userId,
      action: 'UPDATE_APPLICATION',
      entityType: 'Application',
      entityId: id,
      oldValue: {
        code: app.code,
        name: app.name,
        description: app.description,
        status: app.status,
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
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      },
    });

    await this.auditService.record({
      userId,
      action: 'TOGGLE_APPLICATION_STATUS',
      entityType: 'Application',
      entityId: id,
      oldValue: { status: app.status },
      newValue: { status: updated.status },
    });

    return updated;
  }
}
