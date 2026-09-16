import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ example: 'MEDICAL' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Medical Benefit Application' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Handles medical benefit requests and claims' })
  @IsString()
  @IsOptional()
  description?: string;
}
