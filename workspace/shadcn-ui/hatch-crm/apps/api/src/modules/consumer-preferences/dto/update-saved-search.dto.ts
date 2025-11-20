import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

import { SavedSearchFrequencyDto } from './create-saved-search.dto';

export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  criteria?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @IsOptional()
  @IsEnum(SavedSearchFrequencyDto)
  frequency?: SavedSearchFrequencyDto;
}
