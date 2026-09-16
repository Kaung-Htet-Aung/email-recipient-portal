import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmailListDto {
  @ApiProperty({ example: 'uuid-of-application' })
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ example: 'MEDICAL_CLAIM_APPROVERS' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Medical Claim Approvers' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Recipients who approve medical claims' })
  @IsString()
  @IsOptional()
  description?: string;
}