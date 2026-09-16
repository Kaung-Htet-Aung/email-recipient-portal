import { IsEnum, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RecipientType } from '@prisma/client';

export class UpdateRecipientTypeDto {
  @ApiProperty({ enum: RecipientType, example: 'CC' })
  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}