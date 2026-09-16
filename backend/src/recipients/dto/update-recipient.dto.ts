import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRecipientDto {
  @ApiPropertyOptional({ example: 'EMP001' })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9-]+$/i, {
    message: 'Employee code can only contain alphanumeric characters and hyphens',
  })
  employeeCode?: string;

  @ApiPropertyOptional({ example: 'Dr. Aung' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'doctor@company.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}