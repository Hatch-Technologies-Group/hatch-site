import { IsOptional, IsString } from 'class-validator';

export class GenerateOnboardingTasksDto {
  @IsString()
  agentProfileId!: string;

  @IsOptional()
  @IsString()
  workflowTemplateId?: string;
}
