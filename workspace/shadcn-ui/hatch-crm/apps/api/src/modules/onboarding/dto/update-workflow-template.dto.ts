import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

class UpdateWorkflowTemplateTaskDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assignedToRole?: string | null;

  @IsOptional()
  @IsString()
  trainingModuleId?: string | null;

  @IsOptional()
  @IsString()
  orgFileId?: string | null;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class UpdateWorkflowTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkflowTemplateTaskDto)
  tasks?: UpdateWorkflowTemplateTaskDto[];
}
