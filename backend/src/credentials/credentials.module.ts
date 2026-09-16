import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [CredentialsController],
  providers: [CredentialsService, AuditService],
  exports: [CredentialsService],
})
export class CredentialsModule {}