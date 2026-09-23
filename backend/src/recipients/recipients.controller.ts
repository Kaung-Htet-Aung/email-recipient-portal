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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RecipientsService } from './recipients.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { UpdateRecipientDto } from './dto/update-recipient.dto';
import { QueryRecipientDto } from './dto/query-recipient.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Recipients')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('recipients')
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  @ApiOperation({ summary: 'List recipients with search and filters' })
  findAll(@Query() query: QueryRecipientDto) {
    return this.recipientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recipient by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.recipientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a recipient' })
  create(@Body() dto: CreateRecipientDto, @Request() req: AuthenticatedRequest) {
    return this.recipientsService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a recipient' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateRecipientDto, @Request() req: AuthenticatedRequest) {
    return this.recipientsService.update(id, dto, req.user.id);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle recipient status' })
  @ApiParam({ name: 'id', type: String })
  toggleStatus(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.recipientsService.toggleStatus(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recipient' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.recipientsService.remove(id, req.user.id);
  }
}