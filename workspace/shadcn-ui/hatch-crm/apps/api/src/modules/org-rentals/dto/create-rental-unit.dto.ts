import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRentalUnitDto {
  @IsString()
  propertyId!: string;

  @IsOptional()
  @IsString()
  name?: string;

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
