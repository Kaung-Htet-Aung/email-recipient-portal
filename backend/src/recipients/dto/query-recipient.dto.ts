import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const RECIPIENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class QueryRecipientDto {
  @ApiPropertyOptional({ example: 'Aung' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ enum: RECIPIENT_STATUSES, example: 'ACTIVE' })
  @IsIn(RECIPIENT_STATUSES)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}