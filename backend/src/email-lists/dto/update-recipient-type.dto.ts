import {
  IsIn,
  IsInt,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RECIPIENT_TYPES } from './add-recipient.dto';

export class UpdateRecipientTypeDto {
  @ApiPropertyOptional({ enum: RECIPIENT_TYPES, example: 'CC' })
  @IsIn(RECIPIENT_TYPES)
  @IsOptional()
  recipientType?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: 'APPROVER' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  role?: string;

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