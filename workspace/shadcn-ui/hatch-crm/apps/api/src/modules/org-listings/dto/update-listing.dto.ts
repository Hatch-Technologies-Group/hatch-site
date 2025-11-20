import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrgListingStatus } from '@hatch/db';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class UpdateListingDto {
  @ApiPropertyOptional({ description: 'Assign to a different agent profile or null to clear' })
  @IsOptional()
  @IsString()
  agentProfileId?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  listPrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  propertyType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bathrooms?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  squareFeet?: number | null;

  @ApiPropertyOptional({ description: 'ISO date for expiration or null to clear' })
  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @ApiPropertyOptional({ enum: OrgListingStatus })
  @IsOptional()
  @IsEnum(OrgListingStatus)
  status?: OrgListingStatus;
}
