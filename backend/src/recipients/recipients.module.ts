import { Module } from '@nestjs/common';
import { RecipientsService } from './recipients.service';
import { RecipientsController } from './recipients.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [RecipientsController],
  providers: [RecipientsService, AuditService],
  exports: [RecipientsService],
})
export class RecipientsModule {}