import { IsOptional, IsString } from 'class-validator';

export class AgentAnalyticsQueryDto {
  @IsString()
  agentProfileId!: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
