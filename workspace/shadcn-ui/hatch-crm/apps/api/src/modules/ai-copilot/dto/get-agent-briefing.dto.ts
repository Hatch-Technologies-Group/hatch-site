import { IsOptional, IsString } from 'class-validator';

export class GetAgentBriefingDto {
  @IsOptional()
  @IsString()
  date?: string;
}
