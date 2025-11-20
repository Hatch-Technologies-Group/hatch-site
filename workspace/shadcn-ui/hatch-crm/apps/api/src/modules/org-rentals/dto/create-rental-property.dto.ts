import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

type RentalPropertyTypeOption = 'SINGLE_FAMILY' | 'CONDO' | 'MULTI_FAMILY' | 'COMMERCIAL' | 'OTHER';

export class CreateRentalPropertyDto {
  @IsOptional()
  @IsString()
  listingId?: string;

  @IsString()
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  postalCode!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  propertyType?: RentalPropertyTypeOption;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  ownerContact?: string;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  squareFeet?: number;
}
