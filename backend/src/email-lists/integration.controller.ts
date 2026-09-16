import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiHeader,
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { EmailListsService } from './email-lists.service';
import { AppGuard } from '../auth/guards/app.guard';
import { AppApiRequest } from '../common/types/request.types';

@ApiTags('Application Integration API')
@Controller('email-lists')
export class IntegrationController {
  constructor(private readonly emailListsService: EmailListsService) {}

  @Get(':applicationCode/:listCode')
  @UseGuards(AppGuard)
  @ApiOperation({
    summary:
      'Get resolved recipients for an email list. Application-scoped: the calling application can only access its own lists.',
    description:
      'Authenticate with X-API-KEY (or Authorization: Bearer <key>).\nExample: GET /api/email-lists/MEDICAL/MEDICAL_CLAIM_APPROVERS  (header X-API-KEY: erp_xxx)',
  })
  @ApiHeader({
    name: 'X-API-KEY',
    description:
      'Application API key. Also accepts Authorization: Bearer <key>.',
    required: true,
  })
  @ApiSecurity('api-key')
  @ApiParam({
    name: 'applicationCode',
    description: 'Application code',
    examples: {
      medical: { value: 'MEDICAL', summary: 'Medical' },
      hr: { value: 'HR', summary: 'Human Resources' },
    },
  })
  @ApiParam({
    name: 'listCode',
    description:
      'Email list code. Pick a list belonging to the chosen application code - mismatched codes return 404.',
    examples: {
      medicalRequestDoctor: {
        value: 'MEDICAL_REQUEST_DOCTOR',
        summary: 'MEDICAL',
      },
      medicalClaimApprovers: {
        value: 'MEDICAL_CLAIM_APPROVERS',
        summary: 'MEDICAL',
      },
      hrLeaveApprovers: { value: 'HR_LEAVE_APPROVERS', summary: 'HR' },
      hrRecruitmentApprovers: {
        value: 'HR_RECRUITMENT_APPROVERS',
        summary: 'HR',
      },
      hrPayroll: { value: 'HR_PAYROLL', summary: 'HR' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized application' })
  @ApiForbiddenResponse({
    description: 'Application is not allowed to access this email list',
  })
  @ApiNotFoundResponse({ description: 'Application or email list not found' })
  async getList(
    @Param('applicationCode') applicationCode: string,
    @Param('listCode') listCode: string,
    @Request() req: AppApiRequest,
  ) {
    return this.emailListsService.getIntegrationList(
      applicationCode,
      listCode,
      req.application.code,
    );
  }
}