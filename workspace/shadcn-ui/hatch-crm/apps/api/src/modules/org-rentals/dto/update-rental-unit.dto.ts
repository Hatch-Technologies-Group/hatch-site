import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

type RentalUnitStatusOption = 'VACANT' | 'OCCUPIED' | 'RESERVED';

export class UpdateRentalUnitDto {
  @IsOptional()
  @IsString()
  status?: RentalUnitStatusOption;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bedrooms?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  squareFeet?: number | null;
}
