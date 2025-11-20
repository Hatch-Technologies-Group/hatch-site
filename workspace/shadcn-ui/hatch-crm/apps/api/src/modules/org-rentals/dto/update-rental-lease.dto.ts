import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

type RentalTenancyTypeOption = 'SEASONAL' | 'ANNUAL' | 'MONTH_TO_MONTH' | 'OTHER';

export class UpdateRentalLeaseDto {
  @IsOptional()
  @IsString()
  tenancyType?: RentalTenancyTypeOption;

  @IsOptional()
  @IsString()
  tenantName?: string;

  @IsOptional()
  @IsString()
  tenantContact?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rentAmount?: number | null;

  @IsOptional()
  @IsBoolean()
  requiresTaxFiling?: boolean;

  @IsOptional()
  @IsBoolean()
  isCompliant?: boolean;

  @IsOptional()
  @IsString()
  complianceNotes?: string | null;
}
