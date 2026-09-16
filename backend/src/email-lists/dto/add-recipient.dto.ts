import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecipientType } from '@prisma/client';

export class AddRecipientDto {
  @ApiProperty({ example: 'uuid-of-recipient' })
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ enum: RecipientType, example: 'TO' })
  @IsEnum(RecipientType)
  @IsOptional()
  recipientType?: RecipientType;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}