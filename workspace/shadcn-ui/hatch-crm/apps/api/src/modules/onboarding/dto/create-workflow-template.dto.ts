import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

class WorkflowTemplateTaskInputDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assignedToRole?: string;

  @IsOptional()
  @IsString()
  trainingModuleId?: string;

  @IsOptional()
  @IsString()
  orgFileId?: string;
}

export class CreateWorkflowTemplateDto {
  @IsEnum(['ONBOARDING', 'OFFBOARDING'])
  type!: 'ONBOARDING' | 'OFFBOARDING';

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTemplateTaskInputDto)
  tasks: WorkflowTemplateTaskInputDto[] = [];
}
