import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ApplicationsModule } from './applications/applications.module';
import { DepartmentsModule } from './departments/departments.module';
import { RecipientsModule } from './recipients/recipients.module';
import { EmailListsModule } from './email-lists/email-lists.module';
import { AuditModule } from './audit/audit.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminSeederService } from './seed/admin.seeder';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ApplicationsModule,
    DepartmentsModule,
    RecipientsModule,
    EmailListsModule,
    AuditModule,
    CredentialsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, AdminSeederService],
})
export class AppModule {}