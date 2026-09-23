import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const RECIPIENT_TYPES = ['TO', 'CC', 'BCC'] as const;

export class AddRecipientDto {
  @ApiProperty({ example: 'uuid-of-recipient' })
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ enum: RECIPIENT_TYPES, example: 'TO' })
  @IsIn(RECIPIENT_TYPES)
  @IsOptional()
  recipientType?: string;

  @ApiPropertyOptional({ example: 'APPROVER' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: 'uuid-of-email-list-recipient' })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.afterRecipientId, { message: 'beforeRecipientId and afterRecipientId cannot both be set' })
  beforeRecipientId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-email-list-recipient' })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.beforeRecipientId, { message: 'beforeRecipientId and afterRecipientId cannot both be set' })
  afterRecipientId?: string;
}