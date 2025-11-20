import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @ApiPropertyOptional({ description: 'Listing id associated with this transaction' })
  @IsOptional()
  @IsString()
  listingId?: string;

  @ApiPropertyOptional({ description: 'Agent profile responsible for the transaction' })
  @IsOptional()
  @IsString()
  agentProfileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerName?: string;

  @ApiPropertyOptional({ description: 'ISO date when contract signed' })
  @IsOptional()
  @Type(() => Date)
  contractSignedAt?: string;

  @ApiPropertyOptional({ description: 'ISO date for inspection' })
  @IsOptional()
  @Type(() => Date)
  inspectionDate?: string;

  @ApiPropertyOptional({ description: 'ISO date for financing deadline' })
  @IsOptional()
  @Type(() => Date)
  financingDate?: string;

  @ApiPropertyOptional({ description: 'ISO closing date' })
  @IsOptional()
  @Type(() => Date)
  closingDate?: string;
}
