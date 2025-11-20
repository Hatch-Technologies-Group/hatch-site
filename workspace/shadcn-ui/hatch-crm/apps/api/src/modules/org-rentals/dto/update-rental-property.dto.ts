import { IsOptional, IsString } from 'class-validator';

type RentalStatusOption = 'ACTIVE' | 'INACTIVE' | 'UNDER_MGMT' | 'OFF_MGMT';

export class UpdateRentalPropertyDto {
  @IsOptional()
  @IsString()
  status?: RentalStatusOption;

  @IsOptional()
  @IsString()
  ownerName?: string | null;

  @IsOptional()
  @IsString()
  ownerContact?: string | null;
}
