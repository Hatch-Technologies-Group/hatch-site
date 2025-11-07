import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

class ExitReasonDto {
  @IsString()
  key!: string;

  @IsString()
  label!: string;
}

export class StagePayloadDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsInt()
  probWin?: number | null;

  @IsOptional()
  @IsInt()
  slaHours?: number | null;

  @IsOptional()
  @IsInt()
  slaMinutes?: number | null;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExitReasonDto)
  exitReasons?: ExitReasonDto[] | null;
}

export class MutateStagesDto {
  @IsIn(['create', 'update', 'delete', 'reorder'])
  operation!: 'create' | 'update' | 'delete' | 'reorder';

  @IsOptional()
  @ValidateNested()
  @Type(() => StagePayloadDto)
  stage?: StagePayloadDto;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stageOrder?: string[];
}

export class FieldSetPayloadDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  target!: string;

  schema!: unknown;

  @IsOptional()
  uiSchema?: unknown;

  @IsOptional()
  visibility?: unknown;
}

export class MutateFieldSetDto {
  @IsIn(['create', 'update', 'delete'])
  operation!: 'create' | 'update' | 'delete';

  @IsOptional()
  @ValidateNested()
  @Type(() => FieldSetPayloadDto)
  fieldSet?: FieldSetPayloadDto;

  @IsOptional()
  @IsString()
  fieldSetId?: string;
}

class AutomationActionDto {
  definition!: unknown;
}

export class AutomationPayloadDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string | null;

  trigger!: unknown;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions!: AutomationActionDto[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class MutateAutomationDto {
  @IsIn(['create', 'update', 'delete', 'toggle', 'test'])
  operation!: 'create' | 'update' | 'delete' | 'toggle' | 'test';

  @IsOptional()
  @ValidateNested()
  @Type(() => AutomationPayloadDto)
  automation?: AutomationPayloadDto;

  @IsOptional()
  @IsString()
  automationId?: string;
}

export class StageMigrationMappingDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;
}

export class PublishPipelineDto {
  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  assignDefault?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StageMigrationMappingDto)
  migration?: StageMigrationMappingDto[];
}

export class AssignPipelineDto {
  @IsOptional()
  @IsBoolean()
  setDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StageMigrationMappingDto)
  migration?: StageMigrationMappingDto[];
}

export class CreatePipelineDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsString()
  sourcePipelineId?: string;

  @IsOptional()
  @IsBoolean()
  cloneFromActive?: boolean;
}

export class UpdatePipelineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
