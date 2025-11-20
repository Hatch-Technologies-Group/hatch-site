import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class SearchListingsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBathrooms?: number;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRental?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;
}
