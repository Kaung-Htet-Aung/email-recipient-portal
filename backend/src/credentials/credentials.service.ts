import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCredentialDto } from './dto/create-credential.dto';

@Injectable()
export class CredentialsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private generateApiKey(): string {
    return `erp_${randomBytes(24).toString('hex')}`;
  }

  async generate(applicationId: string, dto: CreateCredentialDto, userId?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new NotFoundException('Application not found');

    const apiKey = this.generateApiKey();
    const credential = await this.prisma.applicationCredential.create({
      data: {
        applicationId,
        apiKey,
        name: dto.name,
        description: dto.description,
      },
    });

    await this.auditService.record({
      userId,
      action: 'CREATE_CREDENTIAL',
      entityType: 'ApplicationCredential',
      entityId: credential.id,
      newValue: {
        applicationId,
        applicationCode: app.code,
        name: dto.name,
      },
    });

    return {
      ...credential,
      apiKey,
    };
  }

  async findAll(applicationId?: string) {
    const where = applicationId ? { applicationId } : {};
    return this.prisma.applicationCredential.findMany({
      where,
      include: { application: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, userId?: string) {
    const credential = await this.prisma.applicationCredential.findUnique({
      where: { id },
    });
    if (!credential) throw new NotFoundException('Credential not found');

    const updated = await this.prisma.applicationCredential.update({
      where: { id },
      data: { status: credential.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });

    await this.auditService.record({
      userId,
      action: 'TOGGLE_CREDENTIAL_STATUS',
      entityType: 'ApplicationCredential',
      entityId: id,
      oldValue: { status: credential.status },
      newValue: { status: updated.status },
    });

    return updated;
  }

  async regenerate(id: string, userId?: string) {
    const credential = await this.prisma.applicationCredential.findUnique({
      where: { id },
    });
    if (!credential) throw new NotFoundException('Credential not found');

    const apiKey = this.generateApiKey();
    const updated = await this.prisma.applicationCredential.update({
      where: { id },
      data: { apiKey },
    });

    await this.auditService.record({
      userId,
      action: 'REGENERATE_CREDENTIAL',
      entityType: 'ApplicationCredential',
      entityId: id,
    });

    return {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      apiKey,
    };
  }
}