import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecipientDto {
  @ApiProperty({ example: 'EMP001' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9-]+$/i, {
    message: 'Employee code can only contain alphanumeric characters and hyphens',
  })
  employeeCode: string;

  @ApiProperty({ example: 'Dr. Aung' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'doctor@company.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'uuid' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}