import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL || 'admin@portal.com';
    const password =
      process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';

    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.prisma.adminUser.create({
        data: {
          email,
          name: 'Portal Administrator',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      this.logger.log(`Default admin user created: ${email}`);
    }
  }
}