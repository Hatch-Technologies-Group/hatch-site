import { IsDateString, IsOptional, IsString } from 'class-validator';

type RentalTaxStatusOption = 'PENDING' | 'PAID' | 'OVERDUE';

export class UpdateRentalTaxScheduleDto {
  @IsOptional()
  @IsString()
  status?: RentalTaxStatusOption;

  @IsOptional()
  @IsDateString()
  paidDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
