import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

type RentalTenancyTypeOption = 'SEASONAL' | 'ANNUAL' | 'MONTH_TO_MONTH' | 'OTHER';

export class CreateRentalLeaseDto {
  @IsString()
  unitId!: string;

  @IsOptional()
  @IsString()
  tenancyType?: RentalTenancyTypeOption;

  @IsString()
  tenantName!: string;

  @IsOptional()
  @IsString()
  tenantContact?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rentAmount?: number;

  @IsOptional()
  @IsBoolean()
  requiresTaxFiling?: boolean;
}
