import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'MEDICAL' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Medical Department' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Handles medical matters' })
  @IsString()
  @IsOptional()
  description?: string;
}