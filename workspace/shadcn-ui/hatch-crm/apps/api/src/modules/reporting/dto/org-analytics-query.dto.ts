import { IsOptional, IsString } from 'class-validator';

export class OrgAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
