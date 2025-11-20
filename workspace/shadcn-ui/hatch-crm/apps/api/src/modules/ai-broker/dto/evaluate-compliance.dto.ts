import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class EvaluateComplianceDto {
  @ApiProperty({ enum: ['LISTING', 'TRANSACTION'] })
  @IsEnum(['LISTING', 'TRANSACTION'])
  targetType!: 'LISTING' | 'TRANSACTION';

  @ApiPropertyOptional({ description: 'Listing id when evaluating a listing' })
  @ValidateIf((o) => o.targetType === 'LISTING')
  @IsString()
  listingId?: string;

  @ApiPropertyOptional({ description: 'Transaction id when evaluating a transaction' })
  @ValidateIf((o) => o.targetType === 'TRANSACTION')
  @IsString()
  transactionId?: string;
}
