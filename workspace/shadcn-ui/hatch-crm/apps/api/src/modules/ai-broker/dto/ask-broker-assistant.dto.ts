import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AskBrokerAssistantDto {
  @ApiProperty({ description: 'Question for the AI broker assistant' })
  @IsString()
  question!: string;

  @ApiPropertyOptional({
    enum: ['GENERAL', 'LISTING', 'TRANSACTION', 'TRAINING', 'COMPLIANCE'],
    description: 'Optional hint to steer the AI context'
  })
  @IsOptional()
  @IsEnum(['GENERAL', 'LISTING', 'TRANSACTION', 'TRAINING', 'COMPLIANCE'])
  contextType?: 'GENERAL' | 'LISTING' | 'TRANSACTION' | 'TRAINING' | 'COMPLIANCE';

  @ApiPropertyOptional({ description: 'Optional listing id to ground the answer' })
  @IsOptional()
  @IsString()
  listingId?: string;

  @ApiPropertyOptional({ description: 'Optional transaction id to ground the answer' })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
