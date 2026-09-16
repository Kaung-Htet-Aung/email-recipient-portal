import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCredentialDto {
  @ApiProperty({ example: 'MEDICAL_APP_PRIMARY' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Primary credential for the Medical application' })
  @IsString()
  @IsOptional()
  description?: string;
}