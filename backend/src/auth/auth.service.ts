import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      await this.auditService.record({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'AdminUser',
        entityId: user.id,
      });
    } catch (e) {
      console.error('Failed to record login audit:', e);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateAdminUser(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async validateApiKey(apiKey: string) {
    const credential = await this.prisma.applicationCredential.findUnique({
      where: { apiKey },
      include: { application: true },
    });

    if (!credential || credential.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid API key');
    }

    if (credential.application.status !== 'ACTIVE') {
      throw new UnauthorizedException('Application is inactive');
    }

    return credential;
  }
}
