import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

const statuses = ['PRE_CONTRACT','UNDER_CONTRACT','CONTINGENT','CLOSED','CANCELLED'] as const;

export class UpdateTransactionDto {
  @ApiProperty({ required: false, enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: typeof statuses[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  buyerName?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sellerName?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractSignedAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inspectionDate?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  financingDate?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  closingDate?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCompliant?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complianceNotes?: string | null;
}

