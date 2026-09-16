import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, AuditService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}