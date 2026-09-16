import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Application Credentials')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'List credentials, optionally filtered by application' })
  findAll(@Query('applicationId') applicationId?: string) {
    return this.credentialsService.findAll(applicationId);
  }

  @Post('applications/:applicationId')
  @ApiOperation({ summary: 'Generate a new API key for an application' })
  @ApiParam({ name: 'applicationId', type: String })
  generate(
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateCredentialDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.credentialsService.generate(applicationId, dto, req.user.id);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke / restore a credential' })
  @ApiParam({ name: 'id', type: String })
  revoke(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.credentialsService.revoke(id, req.user.id);
  }

  @Patch(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate a credential API key' })
  @ApiParam({ name: 'id', type: String })
  regenerate(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.credentialsService.regenerate(id, req.user.id);
  }
}