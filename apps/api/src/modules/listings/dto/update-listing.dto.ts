import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';

const statuses = [
  'DRAFT',
  'PENDING_BROKER_APPROVAL',
  'ACTIVE',
  'PENDING',
  'CLOSED',
  'WITHDRAWN',
  'EXPIRED'
] as const;

export class UpdateListingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentProfileId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  listPrice?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  propertyType?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  bedrooms?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  bathrooms?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  squareFeet?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @ApiProperty({ required: false, enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: typeof statuses[number];
}

