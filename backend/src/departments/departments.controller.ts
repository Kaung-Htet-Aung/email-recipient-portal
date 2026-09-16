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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthenticatedRequest } from '../common/types/request.types';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: CreateDepartmentDto, @Request() req: AuthenticatedRequest) {
    return this.departmentsService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a department' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.departmentsService.update(id, dto, req.user.id);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle department status' })
  @ApiParam({ name: 'id', type: String })
  toggleStatus(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.departmentsService.toggleStatus(id, req.user.id);
  }
}