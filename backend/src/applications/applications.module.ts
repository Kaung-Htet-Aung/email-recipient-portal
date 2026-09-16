import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, AuditService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
