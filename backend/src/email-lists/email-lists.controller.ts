import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EmailListsService } from './email-lists.service';
import { CreateEmailListDto } from './dto/create-email-list.dto';
import { UpdateEmailListDto } from './dto/update-email-list.dto';
import { AddRecipientDto } from './dto/add-recipient.dto';
import { UpdateRecipientTypeDto } from './dto/update-recipient-type.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Email Lists')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('email-lists')
export class EmailListsController {
  constructor(private readonly emailListsService: EmailListsService) {}

  @Get()
  @ApiOperation({ summary: 'List email lists with optional application filter' })
  @ApiQuery({ name: 'applicationId', required: false, type: String })
  findAll(@Query('applicationId') applicationId?: string) {
    return this.emailListsService.findAll(applicationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email list by ID with recipients' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.emailListsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an email list' })
  create(@Body() dto: CreateEmailListDto, @Request() req: AuthenticatedRequest) {
    return this.emailListsService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an email list' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateEmailListDto, @Request() req: AuthenticatedRequest) {
    return this.emailListsService.update(id, dto, req.user.id);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle email list status' })
  @ApiParam({ name: 'id', type: String })
  toggleStatus(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.emailListsService.toggleStatus(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an email list' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.emailListsService.remove(id, req.user.id);
  }

  @Post(':id/recipients')
  @ApiOperation({ summary: 'Add a recipient to an email list' })
  @ApiParam({ name: 'id', type: String })
  addRecipient(@Param('id') id: string, @Body() dto: AddRecipientDto, @Request() req: AuthenticatedRequest) {
    return this.emailListsService.addRecipient(id, dto, req.user.id);
  }

  @Delete(':id/recipients/:recipientId')
  @ApiOperation({ summary: 'Remove a recipient from an email list' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'recipientId', type: String })
  removeRecipient(
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.emailListsService.removeRecipient(id, recipientId, req.user.id);
  }

  @Patch(':id/recipients/:recipientId')
  @ApiOperation({ summary: 'Update recipient type (TO/CC/BCC), role, and priority' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'recipientId', type: String })
  updateRecipientType(
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
    @Body() dto: UpdateRecipientTypeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.emailListsService.updateRecipientType(id, recipientId, dto, req.user.id);
  }
}