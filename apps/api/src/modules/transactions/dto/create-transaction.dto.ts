import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  listingId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentProfileId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sellerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractSignedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inspectionDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  financingDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  closingDate?: string;
}

