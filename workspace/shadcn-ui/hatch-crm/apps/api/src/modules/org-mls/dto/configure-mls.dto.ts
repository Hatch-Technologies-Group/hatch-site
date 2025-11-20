import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

type MlsProviderOption = 'STELLAR' | 'NABOR' | 'MATRIX' | 'GENERIC';

export class ConfigureMlsDto {
  @IsIn(['STELLAR', 'NABOR', 'MATRIX', 'GENERIC'])
  provider!: MlsProviderOption;

  @IsOptional()
  @IsString()
  officeCode?: string;

  @IsOptional()
  @IsString()
  brokerId?: string;

  @IsOptional()
  @IsString()
  boardName?: string;

  @IsOptional()
  @IsString()
  boardUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
