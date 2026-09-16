import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all applications' })
  findAll() {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new application' })
  create(@Body() dto: CreateApplicationDto, @Request() req: AuthenticatedRequest) {
    return this.applicationsService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an application' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.applicationsService.update(id, dto, req.user.id);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle application status' })
  @ApiParam({ name: 'id', type: String })
  toggleStatus(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.applicationsService.toggleStatus(id, req.user.id);
  }
}
