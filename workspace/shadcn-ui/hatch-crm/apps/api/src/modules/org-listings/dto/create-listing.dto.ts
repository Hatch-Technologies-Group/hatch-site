import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @ApiProperty({ required: false, description: 'Agent profile responsible for the listing' })
  @IsOptional()
  @IsString()
  agentProfileId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  city!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  state!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  mlsNumber?: string;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  listPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  squareFeet?: number;

  @ApiProperty({ required: false, description: 'ISO date for listing expiration' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
