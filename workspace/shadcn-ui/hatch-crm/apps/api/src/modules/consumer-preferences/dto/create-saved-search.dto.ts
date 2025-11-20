import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum SavedSearchFrequencyDto {
  INSTANT = 'INSTANT',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

export class CreateSavedSearchDto {
  @IsString()
  name!: string;

  criteria!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @IsOptional()
  @IsEnum(SavedSearchFrequencyDto)
  frequency?: SavedSearchFrequencyDto;
}
