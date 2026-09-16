import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmailListDto {
  @ApiPropertyOptional({ example: 'MEDICAL_CLAIM_APPROVERS' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Medical Claim Approvers' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Recipients who approve medical claims' })
  @IsString()
  @IsOptional()
  description?: string;
}