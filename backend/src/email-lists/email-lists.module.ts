import { Module } from '@nestjs/common';
import { EmailListsService } from './email-lists.service';
import { EmailListsController } from './email-lists.controller';
import { IntegrationController } from './integration.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [EmailListsController, IntegrationController],
  providers: [EmailListsService, AuditService],
  exports: [EmailListsService],
})
export class EmailListsModule {}