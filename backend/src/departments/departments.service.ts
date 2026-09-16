import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.department.findMany({
      include: {
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { recipients: true },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto, userId?: string) {
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Department with code ${dto.code.toUpperCase()} already exists`,
      );
    }
    const department = await this.prisma.department.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });

    await this.auditService.record({
      userId,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      newValue: {
        code: department.code,
        name: department.name,
        description: department.description,
      },
    });

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto, userId?: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');

    if (dto.code && dto.code.toUpperCase() !== dept.code) {
      const existing = await this.prisma.department.findUnique({
        where: { code: dto.code.toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(
          `Department with code ${dto.code.toUpperCase()} already exists`,
        );
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
      },
    });

    await this.auditService.record({
      userId,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      oldValue: {
        code: dept.code,
        name: dept.name,
        description: dept.description,
        status: dept.status,
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
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    const updated = await this.prisma.department.update({
      where: { id },
      data: { status: dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });

    await this.auditService.record({
      userId,
      action: 'TOGGLE_DEPARTMENT_STATUS',
      entityType: 'Department',
      entityId: id,
      oldValue: { status: dept.status },
      newValue: { status: updated.status },
    });

    return updated;
  }
}